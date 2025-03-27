/**
 * Main entry point for HaloPSA Workflows MCP Server
 * Exports functions for interacting with HaloPSA Workflow API
 */

// Import the fresh implementation
import {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
} from './halopsa-direct.js';

// Export the functions
export {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
};

// If this file is run directly, start the MCP server
if (require.main === module) {
  // Import and execute the MCP server
  import('./halopsa-mcp.js');
}
