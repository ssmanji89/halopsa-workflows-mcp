/**
 * HaloPSA Workflows MCP
 * Main entry point
 */
import server from './server/index.js';

// Start the server
server.start().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
