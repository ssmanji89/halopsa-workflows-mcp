/**
 * Configuration Module
 * Centralizes all configuration for the HaloPSA Workflows MCP
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Default configuration values
 */
const defaults = {
  // API Configuration
  api: {
    baseUrl: process.env.HALOPSA_BASE_URL || '',
    tenant: process.env.HALOPSA_TENANT || '',
    clientId: process.env.HALOPSA_CLIENT_ID || '',
    clientSecret: process.env.HALOPSA_CLIENT_SECRET || '',
    scope: process.env.HALOPSA_SCOPE || 'all',
    timeout: parseInt(process.env.HALOPSA_API_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.HALOPSA_API_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.HALOPSA_API_RETRY_DELAY || '1000', 10)
  },
  
  // MCP Server Configuration
  server: {
    name: 'halopsa-workflows',
    description: 'HaloPSA Workflows MCP Server',
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20240620',
      'claude-3-sonnet',
      'claude-3-opus',
      'claude-3-haiku',
      'claude-3-5-sonnet',
      'claude-3-7-sonnet-20250219'
    ],
    connectionTimeout: 60000,
    reconnectDelay: 2000,
    // Use HTTP transport if environment variable is set, otherwise use stdio
    transportType: process.env.USE_HTTP_TRANSPORT === 'true' ? 'http' : 'stdio',
    // HTTP transport settings
    http: {
      port: parseInt(process.env.HTTP_PORT || '3000', 10),
      endpoint: '/mcp'
    },
    // stdio transport settings
    stdio: {
      rawMode: true,
      newlineMode: true
    },
    sessionPersistence: true,
    stableConnections: true,
    keepAlive: true,
    logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase()
  },
  
  // Application Paths
  paths: {
    root: path.join(__dirname, '..', '..'),
    logs: process.env.LOG_DIR || path.join(os.homedir(), 'Library', 'Logs', 'HaloPSA')
  }
};

/**
 * Validate configuration
 * Ensures all required config values are present
 */
function validateConfig(config) {
  const { api } = config;
  const requiredApiConfig = ['baseUrl', 'tenant', 'clientId', 'clientSecret'];
  
  const missingConfig = requiredApiConfig.filter(key => !api[key]);
  
  if (missingConfig.length > 0) {
    console.error('[ERROR] Missing required configuration:', missingConfig.join(', '));
    console.error('Please check your .env file and ensure all required values are set.');
    return false;
  }
  
  return true;
}

// Create configuration object
const config = {
  ...defaults,
  
  // Helper methods
  isDebug() {
    return this.server.logLevel === 'debug';
  },
  
  isValid() {
    return validateConfig(this);
  },
  
  // Return sanitized config (without secrets) for logging
  getSanitized() {
    const sanitized = JSON.parse(JSON.stringify(this));
    if (sanitized.api.clientSecret) {
      sanitized.api.clientSecret = sanitized.api.clientSecret.substring(0, 10) + '...';
    }
    return sanitized;
  }
};

export default config;
