#!/usr/bin/env node

/**
 * HaloPSA MCP Server
 * Wrapper around the direct HaloPSA API implementation
 * Improved with connection handling, error recovery, and protocol compatibility
 * Version: 0.3.0
 */
import { FastMCP } from 'fastmcp';
import fs from 'fs';
import path from 'path';
import {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
} from './halopsa-direct.js';

// Import compatibility layer if available, otherwise use defaults
let createCompatibleMcpServer, createToolParameters, wrapToolHandler;
try {
  const compatModule = await import('./mcp-compatibility.js');
  createCompatibleMcpServer = compatModule.createCompatibleMcpServer;
  createToolParameters = compatModule.createToolParameters;
  wrapToolHandler = compatModule.wrapToolHandler;
} catch (error) {
  console.error(`[ERROR] Failed to import compatibility layer: ${error.message}`);
  // Default implementations if module not available
  createCompatibleMcpServer = (config) => new FastMCP(config);
  createToolParameters = (schema) => schema;
  wrapToolHandler = (handler) => handler;
}

// Set up logging
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const DEBUG = LOG_LEVEL === 'debug';
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_FILE = process.env.LOG_FILE || './halopsa-mcp-server.log';

/**
 * Enhanced logger with file logging support
 */
const logger = {
  _timestamp() {
    return new Date().toISOString();
  },

  _formatMessage(level, message) {
    return `[${this._timestamp()}] [${level.toUpperCase()}] ${message}`;
  },

  _logToFile(message) {
    if (LOG_TO_FILE) {
      try {
        fs.appendFileSync(LOG_FILE, message + '\n');
      } catch (error) {
        console.error(`[ERROR] Failed to write to log file: ${error.message}`);
      }
    }
  },

  debug(message) {
    if (DEBUG) {
      const formattedMessage = this._formatMessage('debug', message);
      console.error(formattedMessage);
      this._logToFile(formattedMessage);
    }
  },

  info(message) {
    const formattedMessage = this._formatMessage('info', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
  },

  warn(message) {
    const formattedMessage = this._formatMessage('warn', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
  },

  error(message, error) {
    const formattedMessage = this._formatMessage('error', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
    
    if (error && error.stack) {
      console.error(error.stack);
      this._logToFile(error.stack);
    }
  }
};

// Server configuration
const SERVER_CONFIG = {
  name: 'halopsa-workflows',
  description: 'HaloPSA Workflows MCP Server',
  version: '0.3.0',
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
  ]
};

// Create a new MCP server with standardized configuration
const mcp = createCompatibleMcpServer(SERVER_CONFIG);

// Set up connection event handlers
mcp.on('connect', ({ session }) => {
  logger.info(`New client connected, session ID: ${session.server?.sessionId || 'unknown'}`);
  
  // Log client info for debugging
  if (DEBUG && session.clientInfo) {
    logger.debug(`Client info: ${JSON.stringify(session.clientInfo)}`);
  }
  
  // Handle session-specific events
  session.on('error', (error) => {
    logger.warn(`Session error: ${error.error?.message || 'Unknown error'}`);
    if (DEBUG) {
      logger.debug(`Session error details: ${JSON.stringify(error)}`);
    }
  });
  
  // Send welcome message
  try {
    session.requestSampling({
      role: 'tool',
      content: [{ 
        type: 'text', 
        text: 'Connected to HaloPSA Workflows MCP Server' 
      }]
    }).catch((error) => {
      logger.debug(`Failed to send welcome message: ${error.message}`);
    });
  } catch (error) {
    logger.debug(`Failed to create welcome message: ${error.message}`);
  }
});

mcp.on('disconnect', ({ session }) => {
  logger.info(`Client disconnected, session ID: ${session.server?.sessionId || 'unknown'}`);
});

mcp.on('error', (error) => {
  logger.error(`Server error: ${error.message || 'Unknown error'}`, error);
});

// Add tools with standardized error handling and parameter validation
mcp.addTool({
  name: 'getWorkflows',
  description: 'Get a list of workflows from HaloPSA',
  parameters: createToolParameters({
    type: 'object',
    properties: {
      includeinactive: {
        type: 'boolean',
        description: 'Whether to include inactive workflows'
      }
    }
  }),
  execute: wrapToolHandler(async (params, { log }) => {
    log.info(`Fetching workflows (includeinactive=${params?.includeinactive || false})`);
    const workflows = await getWorkflows(params?.includeinactive);
    log.info(`Retrieved ${workflows.length} workflows`);
    return { 
      type: 'text',
      text: JSON.stringify(workflows, null, 2)
    };
  })
});

mcp.addTool({
  name: 'getWorkflowSteps',
  description: 'Get a list of workflow steps from HaloPSA',
  parameters: createToolParameters({
    type: 'object',
    properties: {
      includecriteriainfo: {
        type: 'boolean',
        description: 'Include criteria information in the workflow steps'
      }
    }
  }),
  execute: wrapToolHandler(async (params, { log }) => {
    log.info(`Fetching workflow steps (includecriteriainfo=${params?.includecriteriainfo || false})`);
    const steps = await getWorkflowSteps(params?.includecriteriainfo);
    log.info(`Retrieved ${steps.length} workflow steps`);
    return {
      type: 'text',
      text: JSON.stringify(steps, null, 2)
    };
  })
});

mcp.addTool({
  name: 'getWorkflow',
  description: 'Get a single workflow from HaloPSA by ID',
  parameters: createToolParameters({
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The workflow ID'
      },
      includedetails: {
        type: 'boolean',
        description: 'Include workflow details in the response'
      }
    },
    required: ['id']
  }),
  execute: wrapToolHandler(async (params, { log }) => {
    log.info(`Fetching workflow ${params.id} (includedetails=${params?.includedetails || false})`);
    const workflow = await getWorkflow(params.id, params?.includedetails);
    log.info(`Retrieved workflow ${params.id}`);
    return {
      type: 'text',
      text: JSON.stringify(workflow, null, 2)
    };
  })
});

mcp.addTool({
  name: 'deleteWorkflow',
  description: 'Delete a workflow from HaloPSA by ID',
  parameters: createToolParameters({
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The workflow ID to delete'
      }
    },
    required: ['id']
  }),
  execute: wrapToolHandler(async (params, { log }) => {
    log.info(`Deleting workflow ${params.id}`);
    await deleteWorkflow(params.id);
    log.info(`Successfully deleted workflow ${params.id}`);
    return {
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Successfully deleted workflow ${params.id}`
      }, null, 2)
    };
  })
});

mcp.addTool({
  name: 'createWorkflows',
  description: 'Create new workflows in HaloPSA',
  parameters: createToolParameters({
    type: 'object',
    properties: {
      workflows: {
        type: 'array',
        description: 'The workflows to create - array of workflow objects'
      }
    },
    required: ['workflows']
  }),
  execute: wrapToolHandler(async (params, { log }) => {
    log.info(`Creating ${params.workflows.length} workflows`);
    const result = await createWorkflows(params.workflows);
    log.info(`Successfully created ${result.length} workflows`);
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    };
  })
});

// Helper function for improved shutdown handling
async function handleShutdown() {
  logger.info('Shutting down MCP server gracefully...');
  try {
    await mcp.stop();
    logger.info('MCP server stopped successfully');
  } catch (error) {
    logger.error(`Error stopping MCP server: ${error.message}`, error);
  }
  
  // Give pending operations time to complete
  setTimeout(() => {
    process.exit(0);
  }, 500);
}

// Set up signal handlers for graceful shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, error);
  handleShutdown();
});

// Create log directory if it doesn't exist
if (LOG_TO_FILE) {
  const logDirectory = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDirectory)) {
    try {
      fs.mkdirSync(logDirectory, { recursive: true });
    } catch (error) {
      console.error(`Failed to create log directory: ${error.message}`);
    }
  }
}

// Start the server with explicit configuration
logger.info('Starting HaloPSA Workflows MCP Server...');
logger.info(`Server configuration: ${JSON.stringify({
  name: SERVER_CONFIG.name,
  version: SERVER_CONFIG.version,
  models: SERVER_CONFIG.models.length
})}`);

try {
  await mcp.start({
    transportType: 'stdio',
  });
  logger.info('HaloPSA Workflows MCP Server started successfully');
} catch (error) {
  logger.error(`Failed to start MCP server: ${error.message}`, error);
  process.exit(1);
}
