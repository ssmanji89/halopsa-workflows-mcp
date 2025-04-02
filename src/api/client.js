/**
 * HaloPSA API Client
 * Handles all direct API calls to HaloPSA
 */
import axios from 'axios';
import config from '../config/index.js';

// Create logger
const isDebug = config.isDebug();
const logger = {
  debug: (message) => {
    if (isDebug) console.error(`[DEBUG] ${message}`);
  },
  info: (message) => console.error(`[INFO] ${message}`),
  warn: (message) => console.error(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Token cache to avoid repeated authentication
let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

class HaloPSAClient {
  constructor() {
    this.config = config.api;
    
    // Log configuration on startup
    logger.info('HaloPSA API Client');
    logger.info('---------------------------------------');
    logger.info(`Base URL: ${this.config.baseUrl}`);
    logger.info(`Tenant: ${this.config.tenant}`);
    logger.info(`Client ID: ${this.config.clientId}`);
    logger.info(`Client Secret: ${this.config.clientSecret.substring(0, 10)}...`);
    logger.info(`Scope: ${this.config.scope}`);
    logger.info('---------------------------------------');
    
    // Create axios instance with defaults
    this.http = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Get authentication token from HaloPSA
   * @returns {Promise<string>} Access token
   */
  async getAuthToken() {
    // Check if we have a valid cached token
    if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
      logger.debug('Using cached token');
      return tokenCache.accessToken;
    }

    logger.info('Getting new auth token...');
    try {
      // Prepare the token URL with tenant parameter
      // HaloPSA auth endpoints are typically at baseUrl/auth, not baseUrl/api/auth
      const baseUrlWithoutApi = this.config.baseUrl.replace(/\/api$/, '');
      const tokenUrl = `${baseUrlWithoutApi}/auth/token?tenant=${this.config.tenant}`;
      logger.debug(`Token URL: ${tokenUrl}`);

      // Prepare form data exactly like successful curl command
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', this.config.clientId);
      formData.append('client_secret', this.config.clientSecret);
      formData.append('scope', this.config.scope);

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

      logger.info(`Successfully obtained auth token, expires in ${expires_in} seconds`);
      return access_token;
    } catch (error) {
      logger.error('Failed to get auth token:');
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error('Response:', JSON.stringify(error.response.data, null, 2));
        logger.error(`URL: ${error.response.config.url}`);
        logger.error(`Method: ${error.response.config.method}`);
        
        // Remove sensitive info for logging
        const sanitizedData = { ...error.response.config.data };
        if (sanitizedData && typeof sanitizedData === 'string') {
          const formData = new URLSearchParams(sanitizedData);
          formData.set('client_secret', '***REDACTED***');
          logger.error(`Request data: ${formData.toString()}`);
        }
        
        throw new Error(`Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error('No response received from server');
        throw new Error(`Authentication failed: No response from server - ${error.message}`);
      } else {
        logger.error('Error creating request:', error.message);
        throw new Error(`Authentication failed: Request error - ${error.message}`);
      }
    }
  }

  /**
   * Make an authenticated API request to HaloPSA
   * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data (for POST/PUT)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async request(method, endpoint, data = null, params = {}) {
    try {
      // Get auth token
      const token = await this.getAuthToken();
      
      // Prepare API endpoint
      const apiEndpoint = `${this.config.baseUrl}${endpoint.startsWith('/') ? endpoint : '/api/' + endpoint}`;
      logger.debug(`${method} ${apiEndpoint}`);
      
      // Make API request
      const response = await this.http({
        method,
        url: apiEndpoint,
        data,
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      logger.error(`API request failed (${method} ${endpoint}):`);
      if (error.response) {
        logger.error(`Status: ${error.response.status}`);
        logger.error('Response:', JSON.stringify(error.response.data, null, 2));
      } else {
        logger.error(error.message);
      }
      
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  /**
   * Get workflows from HaloPSA
   * @param {boolean} includeInactive - Whether to include inactive workflows
   * @returns {Promise<Array>} Workflows
   */
  async getWorkflows(includeInactive = false) {
    const params = {};
    if (includeInactive !== undefined) {
      params.includeinactive = includeInactive;
    }
    
    return this.request('GET', 'Workflow', null, params);
  }

  /**
   * Get workflow steps from HaloPSA
   * @param {boolean} includeCriteriaInfo - Whether to include criteria information
   * @returns {Promise<Array>} Workflow steps
   */
  async getWorkflowSteps(includeCriteriaInfo = false) {
    const params = {};
    if (includeCriteriaInfo !== undefined) {
      params.includecriteriainfo = includeCriteriaInfo;
    }
    
    return this.request('GET', 'WorkflowStep', null, params);
  }

  /**
   * Get a specific workflow by ID
   * @param {number} id - Workflow ID
   * @param {boolean} includeDetails - Whether to include workflow details
   * @returns {Promise<Object>} Workflow
   */
  async getWorkflow(id, includeDetails = false) {
    const params = {};
    if (includeDetails !== undefined) {
      params.includedetails = includeDetails;
    }
    
    return this.request('GET', `Workflow/${id}`, null, params);
  }

  /**
   * Delete a workflow
   * @param {number} id - Workflow ID to delete
   * @returns {Promise<void>}
   */
  async deleteWorkflow(id) {
    return this.request('DELETE', `Workflow/${id}`);
  }

  /**
   * Create new workflows
   * @param {Array} workflows - Array of workflow objects to create
   * @returns {Promise<Array>} Created workflows
   */
  async createWorkflows(workflows) {
    return this.request('POST', 'Workflow', workflows);
  }
}

// Create singleton instance
const apiClient = new HaloPSAClient();

export default apiClient;
