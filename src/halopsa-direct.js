/**
 * Direct HaloPSA API Implementation
 * Based on successful curl commands, with enhanced error handling and logging
 */
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * HaloPSA API Configuration with validation
 */
const config = {
  baseUrl: process.env.HALOPSA_BASE_URL,
  tenant: process.env.HALOPSA_TENANT,
  clientId: process.env.HALOPSA_CLIENT_ID,
  clientSecret: process.env.HALOPSA_CLIENT_SECRET,
  scope: process.env.HALOPSA_SCOPE || 'all'
};

// Configurable settings with defaults
const settings = {
  tokenRefreshGracePeriod: process.env.TOKEN_REFRESH_GRACE_PERIOD ? 
    parseInt(process.env.TOKEN_REFRESH_GRACE_PERIOD, 10) : 
    60000, // Default: refresh 1 minute before expiry
  requestTimeout: process.env.API_REQUEST_TIMEOUT ? 
    parseInt(process.env.API_REQUEST_TIMEOUT, 10) : 
    30000, // Default: 30 second timeout
  retryAttempts: process.env.API_RETRY_ATTEMPTS ? 
    parseInt(process.env.API_RETRY_ATTEMPTS, 10) : 
    3, // Default: 3 retry attempts
  retryDelay: process.env.API_RETRY_DELAY ? 
    parseInt(process.env.API_RETRY_DELAY, 10) : 
    1000 // Default: 1 second between retries
};

// Validate configuration with enhanced error messages
const missingVars = [];
if (!config.baseUrl) missingVars.push('HALOPSA_BASE_URL');
if (!config.tenant) missingVars.push('HALOPSA_TENANT');
if (!config.clientId) missingVars.push('HALOPSA_CLIENT_ID');
if (!config.clientSecret) missingVars.push('HALOPSA_CLIENT_SECRET');

if (missingVars.length > 0) {
  console.error('[ERROR] Missing required configuration variables. Please check your .env file.');
  console.error(`Missing variables: ${missingVars.join(', ')}`);
  console.error('All are required for the HaloPSA API integration to function properly.');
  process.exit(1);
}

// Log startup information with redacted secrets
console.error('[INFO] HaloPSA Direct API Implementation');
console.error('---------------------------------------');
console.error(`Base URL: ${config.baseUrl}`);
console.error(`Tenant: ${config.tenant}`);
console.error(`Client ID: ${config.clientId}`);
console.error(`Client Secret: ${config.clientSecret.substring(0, 3)}${'*'.repeat(config.clientSecret.length - 6)}${config.clientSecret.substring(config.clientSecret.length - 3)}`);
console.error(`Scope: ${config.scope}`);
console.error(`Token Refresh Grace Period: ${settings.tokenRefreshGracePeriod}ms`);
console.error(`Request Timeout: ${settings.requestTimeout}ms`);
console.error(`Retry Attempts: ${settings.retryAttempts}`);
console.error('---------------------------------------');

// Token cache with initialization
let tokenCache = {
  accessToken: null,
  expiresAt: 0,
  refreshCount: 0,
  lastRefresh: null
};

// Create axios instance with default configuration
const apiClient = axios.create({
  timeout: settings.requestTimeout,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'HaloPSA-Workflows-MCP/0.3.1'
  }
});

// Add request interceptor for automatic token handling
apiClient.interceptors.request.use(async (config) => {
  // Skip token for token endpoint
  if (config.url && config.url.includes('/auth/token')) {
    return config;
  }
  
  // Get a valid token
  try {
    const token = await getAuthToken();
    config.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    console.error('[ERROR] Failed to get auth token for request:', error.message);
    throw error;
  }
  
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry if we've already retried or this is a token request
    if (originalRequest._retry || (originalRequest.url && originalRequest.url.includes('/auth/token'))) {
      return Promise.reject(error);
    }
    
    // Handle token expiration (401 errors)
    if (error.response && error.response.status === 401 && tokenCache.accessToken) {
      console.error('[INFO] Token appears to be expired, invalidating cache and retrying...');
      tokenCache.accessToken = null;
      tokenCache.expiresAt = 0;
      
      originalRequest._retry = true;
      
      try {
        const token = await getAuthToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (retryError) {
        console.error('[ERROR] Failed to refresh token on 401 error:', retryError.message);
        return Promise.reject(retryError);
      }
    }
    
    // Implement retry logic for server errors (5xx) and certain client errors
    if (error.response && 
        (error.response.status >= 500 || error.response.status === 429) && 
        (!originalRequest._retryCount || originalRequest._retryCount < settings.retryAttempts)) {
      
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = settings.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
      console.error(`[INFO] Retry attempt ${originalRequest._retryCount}/${settings.retryAttempts} after ${delay}ms for ${originalRequest.method} ${originalRequest.url}`);
      
      return new Promise(resolve => {
        setTimeout(() => resolve(apiClient(originalRequest)), delay);
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Get authentication token from HaloPSA
 * @returns {Promise<string>} Access token
 */
async function getAuthToken() {
  // Check if we have a valid cached token
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    console.error('[INFO] Using cached token');
    return tokenCache.accessToken;
  }

  console.error('[INFO] Getting new auth token...');
  try {
    // Prepare the token URL with tenant parameter
    // HaloPSA auth endpoints are typically at baseUrl/auth, not baseUrl/api/auth
    const baseUrlWithoutApi = config.baseUrl.replace(/\/api$/, '');
    const tokenUrl = `${baseUrlWithoutApi}/auth/token?tenant=${config.tenant}`;
    console.error(`[DEBUG] Token URL: ${tokenUrl}`);

    // Prepare form data exactly like successful curl command
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', config.clientId);
    formData.append('client_secret', config.clientSecret);
    formData.append('scope', config.scope);

    // Make token request
    const response = await axios.post(tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Extract token data
    const { access_token, expires_in } = response.data;
    
    // Cache the token
    tokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + (expires_in * 1000) - 60000 // Buffer 1 minute
    };

    console.error(`[INFO] Successfully obtained auth token, expires in ${expires_in} seconds`);
    return access_token;
  } catch (error) {
    console.error('[ERROR] Failed to get auth token:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
      console.error(`URL: ${error.response.config.url}`);
      console.error(`Method: ${error.response.config.method}`);
      console.error(`Headers: ${JSON.stringify(error.response.config.headers, null, 2)}`);
      
      // Remove sensitive info for logging
      const sanitizedData = { ...error.response.config.data };
      if (sanitizedData && typeof sanitizedData === 'string') {
        const formData = new URLSearchParams(sanitizedData);
        formData.set('client_secret', '***REDACTED***');
        console.error(`Request data: ${formData.toString()}`);
      }
      
      throw new Error(`Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Request details:', error.request);
      throw new Error(`Authentication failed: No response from server - ${error.message}`);
    } else {
      console.error('Error creating request:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(`Authentication failed: Request error - ${error.message}`);
    }
  }
}

/**
 * Get workflows from HaloPSA
 * @param {boolean} includeInactive - Whether to include inactive workflows
 * @returns {Promise<Array>} Workflows
 */
async function getWorkflows(includeInactive = false) {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Prepare API endpoint
    const apiEndpoint = `${config.baseUrl}/api/Workflow`;
    console.error(`[DEBUG] API Endpoint: ${apiEndpoint}`);

    // Query parameters
    const params = {};
    if (includeInactive !== undefined) {
      params.includeinactive = includeInactive;
    }

    // Make API request
    const response = await axios.get(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    console.error(`[INFO] Retrieved ${response.data.length} workflows`);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Failed to get workflows:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Failed to get workflows: ${error.message}`);
  }
}

/**
 * Get workflow steps from HaloPSA
 * @param {boolean} includeCriteriaInfo - Whether to include criteria information
 * @returns {Promise<Array>} Workflow steps
 */
async function getWorkflowSteps(includeCriteriaInfo = false) {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Prepare API endpoint
    const apiEndpoint = `${config.baseUrl}/api/WorkflowStep`;
    console.error(`[DEBUG] API Endpoint: ${apiEndpoint}`);

    // Query parameters
    const params = {};
    if (includeCriteriaInfo !== undefined) {
      params.includecriteriainfo = includeCriteriaInfo;
    }

    // Make API request
    const response = await axios.get(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    console.log(`[INFO] Retrieved ${response.data.length} workflow steps`);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Failed to get workflow steps:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Failed to get workflow steps: ${error.message}`);
  }
}

/**
 * Get a specific workflow by ID
 * @param {number} id - Workflow ID
 * @param {boolean} includeDetails - Whether to include workflow details
 * @returns {Promise<Object>} Workflow
 */
async function getWorkflow(id, includeDetails = false) {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Prepare API endpoint
    const apiEndpoint = `${config.baseUrl}/api/Workflow/${id}`;
    console.error(`[DEBUG] API Endpoint: ${apiEndpoint}`);

    // Query parameters
    const params = {};
    if (includeDetails !== undefined) {
      params.includedetails = includeDetails;
    }

    // Make API request
    const response = await axios.get(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    console.log(`[INFO] Retrieved workflow ${id}`);
    return response.data;
  } catch (error) {
    console.error(`[ERROR] Failed to get workflow ${id}:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Failed to get workflow ${id}: ${error.message}`);
  }
}

/**
 * Delete a workflow
 * @param {number} id - Workflow ID to delete
 * @returns {Promise<void>}
 */
async function deleteWorkflow(id) {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Prepare API endpoint
    const apiEndpoint = `${config.baseUrl}/api/Workflow/${id}`;
    console.log(`[DEBUG] API Endpoint: ${apiEndpoint}`);

    // Make API request
    await axios.delete(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`[INFO] Deleted workflow ${id}`);
  } catch (error) {
    console.error(`[ERROR] Failed to delete workflow ${id}:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Failed to delete workflow ${id}: ${error.message}`);
  }
}

/**
 * Create a new workflow
 * @param {Array} workflows - Array of workflow objects to create
 * @returns {Promise<Array>} Created workflows
 */
async function createWorkflows(workflows) {
  try {
    // Get auth token
    const token = await getAuthToken();

    // Prepare API endpoint
    const apiEndpoint = `${config.baseUrl}/api/Workflow`;
    console.error(`[DEBUG] API Endpoint: ${apiEndpoint}`);

    // Make API request
    const response = await axios.post(apiEndpoint, workflows, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`[INFO] Created ${response.data.length} workflows`);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Failed to create workflows:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Failed to create workflows: ${error.message}`);
  }
}

// Export the functions
export {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
};

// If this file is run directly, test the functions
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error('[INFO] Running direct test...');
  
  (async () => {
    try {
      // Test getting workflows
      console.error('\n[TEST] Getting workflows...');
      const workflows = await getWorkflows();
      console.error(`Retrieved ${workflows.length} workflows`);
      
      if (workflows.length > 0) {
        console.error('First workflow:', workflows[0]);
        
        // Test getting workflow details
        console.error(`\n[TEST] Getting workflow ${workflows[0].id} details...`);
        const workflow = await getWorkflow(workflows[0].id, true);
        console.error('Workflow details:', workflow);
      }
      
      // Test getting workflow steps
      console.error('\n[TEST] Getting workflow steps...');
      try {
        const steps = await getWorkflowSteps();
        console.error(`Retrieved ${steps.length} workflow steps`);
        if (steps.length > 0) {
          console.error('First workflow step:', steps[0]);
        }
      } catch (error) {
        console.error('Workflow steps not available or accessible');
      }
      
      console.error('\n[INFO] Test completed successfully!');
    } catch (error) {
      console.error('[ERROR] Test failed:', error.message);
    }
  })();
}
