#!/usr/bin/env node

/**
 * Test script for HaloPSA Workflows MCP Server
 * This script simulates interaction with the MCP server to ensure it works correctly
 * Enhanced with proper protocol requirements and debugging
 */

import { exec } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Debug mode - set to true for detailed logging
const DEBUG = true;
const STARTUP_DELAY = 5000; // 5 seconds to allow server to initialize

// Debug logger
function debug(message, ...args) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

// Start the MCP server
console.log('Starting MCP server in test script...');
const server = exec('node dist/halopsa-mcp.js', {
  cwd: process.cwd(),
  env: {
    ...process.env,
    LOG_LEVEL: 'debug',  // Set log level to debug for more verbose output
    NODE_ENV: 'test'     // Add test flag to differentiate from production
  }
});

server.stdout.on('data', (data) => {
  console.log(`[SERVER STDOUT] ${data.trim()}`);
});

server.stderr.on('data', (data) => {
  console.log(`[SERVER STDERR] ${data.trim()}`);
});

// Give the server more time to start
setTimeout(async () => {
  try {
    console.log('Server startup delay complete, creating test client...');
    
    // Create a separate client to connect directly to MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/halopsa-mcp.js'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',  // Set log level to debug for more verbose output
        NODE_ENV: 'test'     // Add test flag to differentiate from production
      }
    });
    
    // Setup transport event handlers for debugging
    transport.onerror = (error) => {
      debug('Transport error:', error);
    };
    
    transport.onclose = () => {
      debug('Transport closed');
    };
    
    transport.onmessage = (message) => {
      debug('Transport message:', JSON.stringify(message));
    };
    
    // Create client with proper configuration
    const client = new Client();
    
    // Set proper client info according to MCP protocol requirements
    debug('Setting client info');
    client.clientInfo = {
      name: "HaloPSA Workflows Test Client",
      version: "1.0.0",
      capabilities: {
        models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
      }
    };
    
    // Connect to the server with proper timeout for debugging
    console.log('Connecting to server...');
    debug('Client connecting with info:', client.clientInfo);
    
    // Connect without manually starting the transport
    await client.connect(transport);
    console.log('Connected to server');
    
    // List available tools
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name).join(', '));
    
    // Test the getWorkflows tool
    console.log('Testing getWorkflows tool...');
    const result = await client.callTool({
      name: 'getWorkflows',
      arguments: {
        includeinactive: true
      }
    });
    
    console.log('Workflows result:', result);
    
    // Close the client and server
    console.log('Closing client...');
    await client.close();
    
    console.log('Test completed successfully!');
    server.kill();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    // More detailed error information
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.data) {
      console.error('Error data:', error.data);
    }
    server.kill();
    process.exit(1);
  }
}, STARTUP_DELAY);  // Increased timeout to ensure server is fully started

// Safety timeout to prevent hanging
setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  server.kill();
  process.exit(1);
}, 30000);  // 30 second timeout
