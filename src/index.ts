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
// Using ES modules method for checking if this is the main module
// The import.meta.url === globalThis.url is not reliable, so use an IIFE approach
(async function() {
  // Check if this file is being executed directly
  const isMainModule = import.meta.url.endsWith('/index.js') || 
                       import.meta.url.endsWith('/index.ts');
  
  if (isMainModule) {
    // Import and execute the MCP server
    await import('./halopsa-mcp.js');
  }
})();
