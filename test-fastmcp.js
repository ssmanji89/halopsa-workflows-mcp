#!/usr/bin/env node

/**
 * Test script for HaloPSA Workflows MCP Server using Client SDK
 * This version uses the standard Client API directly for compatibility testing
 */

import { exec } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Main test function
async function runTest() {
  // Start the MCP server as a child process
  console.log('Starting server for FastMCP client test...');
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
    const output = data.toString().trim();
    if (output) {
      console.log(`[SERVER] ${output}`);
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[SERVER ERR] ${output}`);
    }
  });

  // Give the server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
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
    
    // Create client with proper configuration
    console.log('Creating client...');
    const client = new Client();
    
    // Connect to the server
    console.log('Connecting to server...');
    await client.connect(transport);
    
    // Initialize client with capabilities
    console.log('Initializing client...');
    await client.initialize({
      clientInfo: {
        name: "FastMCP Test Client",
        version: "1.0.0"
      }
    });
    
    console.log('Connected to server successfully');
    
    // Test listing tools
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log('Tools available:', tools.tools.map(t => t.name).join(', '));
    
    // Test the getWorkflows tool
    console.log('Testing getWorkflows tool...');
    const result = await client.callTool({
      name: 'getWorkflows',
      arguments: {
        includeinactive: true
      }
    });
    
    // Log results
    console.log('Workflows result received');
    if (result.content && result.content[0] && result.content[0].text) {
      try {
        const workflows = JSON.parse(result.content[0].text);
        console.log('Number of workflows:', Array.isArray(workflows) ? workflows.length : 'Unknown');
      } catch (parseError) {
        console.error('Failed to parse workflows result:', parseError.message);
        console.log('Raw result:', result.content[0].text.substring(0, 100) + '...');
      }
    } else {
      console.log('Result format not as expected:', result);
    }
    
    // Disconnect and complete test
    await client.close();
    console.log('Test completed successfully!');
    server.kill();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    server.kill();
    process.exit(1);
  }
}

// Run the test with timeout protection
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
