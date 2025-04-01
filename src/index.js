/**
 * HaloPSA Workflows MCP Server
 * Main entry point for importing functionality
 */

// Export direct API implementation
export {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
} from './halopsa-direct.js';

// Export MCP compatibility helpers
export {
  createCompatibleMcpServer,
  createToolParameters,
  wrapToolHandler,
  PROTOCOL_VERSIONS
} from './mcp-compatibility.js';

// Export any other utilities or types as needed
// Add more exports as the project evolves
