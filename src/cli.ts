#!/usr/bin/env node
/**
 * Command-line entry point for HaloPSA Workflows MCP Server
 * Used when installed globally via npm
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// Load local .env file if it exists
const localEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

// Output help information
console.error(`
HaloPSA Workflows MCP Server
----------------------------
Starting server with the following configuration:

Environment variables:
- HALOPSA_BASE_URL: ${process.env.HALOPSA_BASE_URL ? 'Set ✓' : 'Not set ✗'}
- HALOPSA_CLIENT_ID: ${process.env.HALOPSA_CLIENT_ID ? 'Set ✓' : 'Not set ✗'}
- HALOPSA_CLIENT_SECRET: ${process.env.HALOPSA_CLIENT_SECRET ? 'Set ✓' : 'Not set ✗'}
- LOG_LEVEL: ${process.env.LOG_LEVEL || 'info (default)'}

Server will continue running until interrupted with Ctrl+C.
`);

// Check that required environment variables are set
if (!process.env.HALOPSA_BASE_URL || !process.env.HALOPSA_CLIENT_ID || !process.env.HALOPSA_CLIENT_SECRET) {
  console.error(`
ERROR: Missing required environment variables.
Please set HALOPSA_BASE_URL, HALOPSA_CLIENT_ID, and HALOPSA_CLIENT_SECRET.

These can be set:
1. In your environment
2. In a .env file in the current directory
3. In the claude_desktop_config.json file when using with Claude Desktop
`);
  process.exit(1);
}

// Import and start the server
import './index.js';