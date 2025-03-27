#!/usr/bin/env node

/**
 * HaloPSA MCP Server
 * Wrapper around the direct HaloPSA API implementation
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

// Create a new MCP server
const mcp = new FastMCP({
  name: 'halopsa-workflows',
  description: 'HaloPSA Workflows MCP Server',
  models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
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
  handler: async (params) => {
    try {
      const workflows = await getWorkflows(params?.includeinactive);
      return workflows;
    } catch (error) {
      return {
        error: error.message
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
  handler: async (params) => {
    try {
      const steps = await getWorkflowSteps(params?.includecriteriainfo);
      return steps;
    } catch (error) {
      return {
        error: error.message
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
  handler: async (params) => {
    try {
      const workflow = await getWorkflow(params.id, params?.includedetails);
      return workflow;
    } catch (error) {
      return {
        error: error.message
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
  handler: async (params) => {
    try {
      await deleteWorkflow(params.id);
      return {
        success: true,
        message: `Successfully deleted workflow ${params.id}`
      };
    } catch (error) {
      return {
        error: error.message
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
  handler: async (params) => {
    try {
      const result = await createWorkflows(params.workflows);
      return result;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
});

// Start the server
mcp.start();

console.log('[INFO] HaloPSA Workflows MCP Server started');
