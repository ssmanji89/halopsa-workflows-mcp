#!/usr/bin/env node

/**
 * CLI entry point for HaloPSA Workflows MCP Server
 * This is the file that gets executed when running the package with npx
 */

// Load the MCP server
import './halopsa-mcp.js';

console.log('[INFO] HaloPSA Workflows MCP Server started from CLI');
