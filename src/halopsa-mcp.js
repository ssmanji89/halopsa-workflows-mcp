#!/usr/bin/env node

/**
 * HaloPSA MCP Server
 * Wrapper around the direct HaloPSA API implementation
 * Improved with connection handling and error recovery
 */
import { FastMCP } from 'fastmcp';
import {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
} from './halopsa-direct.js';

// Set up logging
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const debug = LOG_LEVEL === 'debug';

/**
 * Console logging wrapper that only logs if level is appropriate
 */
const logger = {
  debug: (message) => {
    if (debug) console.error(`[DEBUG] ${message}`);
  },
  info: (message) => console.error(`[INFO] ${message}`),
  warn: (message) => console.error(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Create a new MCP server
const mcp = new FastMCP({
  name: 'halopsa-workflows',
  description: 'HaloPSA Workflows MCP Server',
  models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620', 'claude-3-sonnet', 'claude-3-opus', 'claude-3-haiku', 'claude-3-5-sonnet']
});

// Set up connection event handlers
mcp.on('connect', ({ session }) => {
  logger.info(`New client connected, session ID: ${session.server.sessionId}`);
  
  // Handle session-specific events
  session.on('error', (error) => {
    logger.warn(`Session error: ${error.error.message || 'Unknown error'}`);
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
  logger.info(`Client disconnected, session ID: ${session.server.sessionId}`);
});

mcp.on('error', (error) => {
  logger.error(`Server error: ${error.message || 'Unknown error'}`);
});

// Add tools
mcp.addTool({
  name: 'getWorkflows',
  description: 'Get a list of workflows from HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      includeinactive: {
        type: 'boolean',
        description: 'Whether to include inactive workflows'
      }
    }
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflows (includeinactive=${params?.includeinactive || false})`);
      const workflows = await getWorkflows(params?.includeinactive);
      log.info(`Retrieved ${workflows.length} workflows`);
      return { 
        type: 'text',
        text: JSON.stringify(workflows, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflows: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'getWorkflowSteps',
  description: 'Get a list of workflow steps from HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      includecriteriainfo: {
        type: 'boolean',
        description: 'Include criteria information in the workflow steps'
      }
    }
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflow steps (includecriteriainfo=${params?.includecriteriainfo || false})`);
      const steps = await getWorkflowSteps(params?.includecriteriainfo);
      log.info(`Retrieved ${steps.length} workflow steps`);
      return {
        type: 'text',
        text: JSON.stringify(steps, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflow steps: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'getWorkflow',
  description: 'Get a single workflow from HaloPSA by ID',
  parameters: {
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
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflow ${params.id} (includedetails=${params?.includedetails || false})`);
      const workflow = await getWorkflow(params.id, params?.includedetails);
      log.info(`Retrieved workflow ${params.id}`);
      return {
        type: 'text',
        text: JSON.stringify(workflow, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflow ${params.id}: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'deleteWorkflow',
  description: 'Delete a workflow from HaloPSA by ID',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The workflow ID to delete'
      }
    },
    required: ['id']
  },
  execute: async (params, { log }) => {
    try {
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
    } catch (error) {
      log.error(`Failed to delete workflow ${params.id}: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'createWorkflows',
  description: 'Create new workflows in HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      workflows: {
        type: 'array',
        description: 'The workflows to create - array of workflow objects'
      }
    },
    required: ['workflows']
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Creating ${params.workflows.length} workflows`);
      const result = await createWorkflows(params.workflows);
      log.info(`Successfully created ${result.length} workflows`);
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      };
    } catch (error) {
      log.error(`Failed to create workflows: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

// Set up graceful shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack);
  handleShutdown();
});

async function handleShutdown() {
  logger.info('Shutting down MCP server gracefully...');
  try {
    await mcp.stop();
    logger.info('MCP server stopped successfully');
  } catch (error) {
    logger.error(`Error stopping MCP server: ${error.message}`);
  }
  // Give pending operations time to complete
  setTimeout(() => {
    process.exit(0);
  }, 500);
}

// Verify API connectivity before starting the server
async function verifyApiConnectivity() {
  try {
    logger.info('Verifying HaloPSA API connectivity...');
    const token = await getAuthToken();
    logger.info('Successfully authenticated with HaloPSA API');
    return true;
  } catch (error) {
    logger.error(`HaloPSA API connectivity test failed: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Start the server with explicit configuration
logger.info('Starting HaloPSA Workflows MCP Server...');
try {
  // Verify API connectivity first
  const apiConnected = await verifyApiConnectivity();
  if (!apiConnected) {
    logger.error('Cannot start MCP server due to HaloPSA API connectivity issues');
    process.exit(1);
  }
  
  // Start the MCP server
  await mcp.start({
    transportType: 'stdio'
  });
  logger.info('HaloPSA Workflows MCP Server started successfully');
} catch (error) {
  logger.error(`Failed to start MCP server: ${error.message}`);
  if (error.stack) {
    logger.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}
