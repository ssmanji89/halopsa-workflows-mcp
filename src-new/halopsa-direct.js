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

// Load environment variables
dotenv.config();

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

// Set up logging based on log level
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logger = {
  error: (message, ...args) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.warn) {
      console.error(`[WARN] ${message}`, ...args);
    }
  },
  info: (message, ...args) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.info) {
      console.error(`[INFO] ${message}`, ...args);
    }
  },
  debug: (message, ...args) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.debug) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
};

logger.info('HaloPSA Direct API Implementation');
logger.info('---------------------------------------');
logger.debug(`Base URL: ${config.baseUrl}`);
logger.debug(`Tenant: ${config.tenant}`);
logger.debug(`Client ID: ${config.clientId}`);
logger.debug(`Client Secret: ${config.clientSecret.substring(0, 10)}...`);
logger.debug(`Scope: ${config.scope}`);
logger.info('---------------------------------------');

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
    logger.info('Using cached token');
    return tokenCache.accessToken;
  }

  logger.info('Getting new auth token...');
  try {
    // Prepare the token URL with tenant parameter
    const tokenUrl = `${config.baseUrl}/auth/token?tenant=${config.tenant}`;
    logger.debug(`Token URL: ${tokenUrl}`);

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

    logger.info(`Successfully obtained auth token, expires in ${expires_in} seconds`);
    return access_token;
  } catch (error) {
    logger.error('Failed to get auth token:');
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error('Response:', error.response.data);
    } else {
      logger.error(error.message);
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
    logger.debug(`API Endpoint: ${apiEndpoint}`);

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

    logger.info(`Retrieved ${response.data.length} workflows`);
    return response.data;
  } catch (error) {
    logger.error('Failed to get workflows:');
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error('Response:', error.response.data);
    } else {
      logger.error(error.message);
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
    logger.debug(`API Endpoint: ${apiEndpoint}`);

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