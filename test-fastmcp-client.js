#!/usr/bin/env node

/**
 * Test script for HaloPSA Workflows MCP Server using the FastMCP library
 * Following TypeScript SDK guidelines for proper MCP implementation
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { exec } from 'child_process';

// Debug mode
const DEBUG = true;

// Debug logging function
function debug(message, ...args) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}

// Main test function
async function runTest() {
  // Start the MCP server as a child process
  console.log('Starting MCP server...');
  const server = exec('node dist/halopsa-mcp.js', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LOG_LEVEL: 'debug',
      NODE_ENV: 'test'
    }
  });

  // Set up output handlers
  server.stdout.on('data', (data) => {
    console.log(`[SERVER STDOUT] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.log(`[SERVER STDERR] ${data.toString().trim()}`);
  });

  // Give the server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Create the MCP client
    console.log('Creating MCP client...');
    
    // Create a transport for the client to communicate with server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/halopsa-mcp.js'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    });
    
    // Set up transport logging for debugging
    transport.onerror = (error) => {
      debug('Transport error:', error);
    };
    
    // Create the client with proper initialization
    const client = new Client();
    
    // Connect to the server through the transport
    console.log('Connecting to the MCP server...');
    await client.connect(transport);
    
    // Set client info AFTER connecting - this is required for compatibility
    await client.initialize({
      clientInfo: {
        name: 'HaloPSA Test Client',
        version: '1.0.0'
      },
      capabilities: {
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      }
    });
    
    console.log('Connected successfully');
    
    // Test listing tools
    console.log('Testing tools/list...');
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name).join(', '));
    
    // Test calling the getWorkflows tool
    console.log('Testing getWorkflows tool...');
    const result = await client.callTool({
      name: 'getWorkflows',
      arguments: {
        includeinactive: true
      }
    });
    
    console.log('Successfully received workflow data');
    const content = result.content[0];
    if (content && content.type === 'text') {
      const workflows = JSON.parse(content.text);
      console.log(`Retrieved ${workflows.length} workflows`);
    }
    
    // Close the client connection
    console.log('Closing client connection...');
    await client.close();
    
    console.log('Test completed successfully!');
    server.kill();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    
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
}

// Set up a timeout to prevent test hanging
const timeout = setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);

// Clear timeout on exit
process.on('exit', () => {
  clearTimeout(timeout);
});

// Run the test
runTest();
