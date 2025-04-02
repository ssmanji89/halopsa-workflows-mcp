#!/usr/bin/env node

/**
 * HaloPSA Workflows MCP Server
 * Entry point that delegates to the implementation in the src directory
 * 
 * This file ensures that the main package.json "bin" entry works correctly
 * while keeping the actual implementation organized in the src/ directory.
 */

// Import and run the actual MCP server implementation
import './src/index.js';

// This file serves as a simple entry point that delegates to the actual implementation
// No additional code is needed here since the import will execute the src/index.js file
