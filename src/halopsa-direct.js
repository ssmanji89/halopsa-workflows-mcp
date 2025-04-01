/**
 * Direct HaloPSA API Implementation
 * Based on successful curl commands
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
 * HaloPSA API Configuration
 */
const config = {
  baseUrl: process.env.HALOPSA_BASE_URL,
  tenant: process.env.HALOPSA_TENANT,
  clientId: process.env.HALOPSA_CLIENT_ID,
  clientSecret: process.env.HALOPSA_CLIENT_SECRET,
  scope: process.env.HALOPSA_SCOPE || 'all'
};

// Validate configuration
if (!config.baseUrl || !config.tenant || !config.clientId || !config.clientSecret) {
  console.error('[ERROR] Missing required configuration. Please check your .env file.');
  console.error('Required variables: HALOPSA_BASE_URL, HALOPSA_TENANT, HALOPSA_CLIENT_ID, HALOPSA_CLIENT_SECRET');
  process.exit(1);
}

console.error('[INFO] HaloPSA Direct API Implementation');
console.error('---------------------------------------');
console.error(`Base URL: ${config.baseUrl}`);
console.error(`Tenant: ${config.tenant}`);
console.error(`Client ID: ${config.clientId}`);
console.error(`Client Secret: ${config.clientSecret.substring(0, 10)}...`);
console.error(`Scope: ${config.scope}`);
console.error('---------------------------------------');

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

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
    const tokenUrl = `${config.baseUrl}/auth/token?tenant=${config.tenant}`;
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

    console.log(`[INFO] Successfully obtained auth token, expires in ${expires_in} seconds`);
    return access_token;
  } catch (error) {
    console.error('[ERROR] Failed to get auth token:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Authentication failed: ${error.message}`);
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
    console.log(`[DEBUG] API Endpoint: ${apiEndpoint}`);

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

    console.log(`[INFO] Retrieved ${response.data.length} workflows`);
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
    console.log(`[DEBUG] API Endpoint: ${apiEndpoint}`);

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
    console.log(`[DEBUG] API Endpoint: ${apiEndpoint}`);

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
    console.log(`[DEBUG] API Endpoint: ${apiEndpoint}`);

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
  console.log('[INFO] Running direct test...');
  
  (async () => {
    try {
      // Test getting workflows
      console.log('\n[TEST] Getting workflows...');
      const workflows = await getWorkflows();
      console.log(`Retrieved ${workflows.length} workflows`);
      
      if (workflows.length > 0) {
        console.log('First workflow:', workflows[0]);
        
        // Test getting workflow details
        console.log(`\n[TEST] Getting workflow ${workflows[0].id} details...`);
        const workflow = await getWorkflow(workflows[0].id, true);
        console.log('Workflow details:', workflow);
      }
      
      // Test getting workflow steps
      console.log('\n[TEST] Getting workflow steps...');
      try {
        const steps = await getWorkflowSteps();
        console.log(`Retrieved ${steps.length} workflow steps`);
        if (steps.length > 0) {
          console.log('First workflow step:', steps[0]);
        }
      } catch (error) {
        console.log('Workflow steps not available or accessible');
      }
      
      console.log('\n[INFO] Test completed successfully!');
    } catch (error) {
      console.error('[ERROR] Test failed:', error.message);
    }
  })();
}
