#!/usr/bin/env node

/**
 * Simple test application for HaloPSA MCP
 * 
 * This demonstrates using the FastMCP client to connect to the MCP server
 * with explicit configuration to ensure compatibility.
 */

import { FastMCP } from 'fastmcp';
import { exec } from 'child_process';

// Flag to control whether to use separate processes for client and server
const USE_SEPARATE_PROCESSES = true;

// Main function to run the test
async function runTest() {
  console.log('Starting HaloPSA MCP test...');
  
  let serverProcess;
  
  // Start the server if using separate processes
  if (USE_SEPARATE_PROCESSES) {
    console.log('Starting MCP server in separate process...');
    serverProcess = exec('node dist/halopsa-mcp.js', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOG_LEVEL: 'debug'
      }
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });
    
    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  try {
    // Create a FastMCP client
    console.log('Creating FastMCP client...');
    const client = new FastMCP({
      name: 'halopsa-test-client',
      description: 'Test client for HaloPSA Workflows MCP',
      version: '1.0.0'
    });
    
    // Set our tools for ease of use (auto-generated from server's available tools)
    client.getWorkflows = async (params = {}) => {
      console.log('Calling getWorkflows tool...');
      return client.callTool('getWorkflows', params);
    };
    
    // Start the client
    console.log('Starting client...');
    await client.start({
      transportType: 'stdio',
      command: 'node',
      args: ['dist/halopsa-mcp.js'],
      env: {
        ...process.env,
        LOG_LEVEL: 'debug'
      },
      cwd: process.cwd()
    });
    
    // Test the getWorkflows tool
    console.log('Testing getWorkflows tool...');
    const result = await client.getWorkflows({ includeinactive: true });
    console.log('Tool execution result:', result);
    
    // Clean up and exit
    console.log('Test completed successfully!');
    await client.stop();
    
    if (serverProcess) {
      serverProcess.kill();
    }
    
    return 0;
  } catch (error) {
    console.error('Test failed:', error);
    
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    if (serverProcess) {
      serverProcess.kill();
    }
    
    return 1;
  }
}

// Run the test with timeout protection
const TEST_TIMEOUT = 30000; // 30 seconds
const testPromise = runTest();

// Add timeout protection
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => {
    reject(new Error('Test timed out after 30 seconds'));
  }, TEST_TIMEOUT);
});

// Run the test with timeout
Promise.race([testPromise, timeoutPromise])
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
