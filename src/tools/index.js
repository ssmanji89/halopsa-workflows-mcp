/**
 * MCP Tools Module
 * Defines all tools available in the HaloPSA Workflows MCP Server
 */
import apiClient from '../api/client.js';

// Create tools registry
const tools = [];

/**
 * Add getWorkflows tool
 */
tools.push({
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
      const workflows = await apiClient.getWorkflows(params?.includeinactive);
      return workflows;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
});

/**
 * Add getWorkflowSteps tool
 */
tools.push({
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
      const steps = await apiClient.getWorkflowSteps(params?.includecriteriainfo);
      return steps;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
});

/**
 * Add getWorkflow tool
 */
tools.push({
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
      const workflow = await apiClient.getWorkflow(params.id, params?.includedetails);
      return workflow;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
});

/**
 * Add deleteWorkflow tool
 */
tools.push({
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
      await apiClient.deleteWorkflow(params.id);
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

/**
 * Add createWorkflows tool
 */
tools.push({
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
      const result = await apiClient.createWorkflows(params.workflows);
      return result;
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
});

/**
 * Add healthcheck tool
 */
tools.push({
  name: 'healthcheck',
  description: 'Check the health of the HaloPSA MCP server and API connection',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      await apiClient.getAuthToken();
      return {
        status: 'healthy',
        api_connected: true,
        server_uptime: process.uptime(),
        version: '1.0.1',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        api_connected: false,
        error: error.message,
        server_uptime: process.uptime(),
        version: '1.0.1',
        timestamp: new Date().toISOString()
      };
    }
  }
});

export default tools;
