#!/usr/bin/env node

/**
 * Test script for HaloPSA Workflows MCP Server using FastMCP
 * This script uses the higher-level FastMCP client API to avoid protocol issues
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';

// Create a FastMCP client instance with proper configuration
const client = new FastMCP({
  name: 'test-client', 
  version: '1.0.0',
  // Adding authentication support for the compatibility layer
  authenticate: async () => {
    return { authenticated: true };
  }
});

// Function to run the test
async function runTest() {
  try {
    console.log('Starting FastMCP client test...');
    
    // Connect to the server with proper environment variables
    await client.start({
      transportType: 'stdio',
      command: 'node',
      args: ['dist/halopsa-mcp.js'],
      env: {
        LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    });
    
    console.log('Connected to server successfully');
    
    // Wait a moment for server initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List available tools
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log('Tools available:', tools.map(t => t.name).join(', '));
    
    // Add tool definitions for client-side type checking
    client.defineTool('getWorkflows', z.object({
      includeinactive: z.boolean().optional()
    }));
    
    // Test the getWorkflows tool using the defined tool
    console.log('Testing getWorkflows tool...');
    const result = await client.callTool('getWorkflows', { 
      includeinactive: true 
    });
    
    // Log results
    console.log('Workflows result received');
    if (result && result.content && result.content[0] && result.content[0].text) {
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
    await client.stop();
    console.log('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    try {
      await client.stop();
    } catch (stopError) {
      console.error('Error during shutdown:', stopError);
    }
    
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
