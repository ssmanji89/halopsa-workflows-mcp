#!/usr/bin/env node

/**
 * Test script for HaloPSA Workflows MCP Server
 * This script simulates interaction with the MCP server to ensure it works correctly
 */

import { exec } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Start the MCP server
console.log('Starting MCP server...');
const server = exec('node halopsa-mcp.js', {
  cwd: process.cwd()
});

server.stdout.on('data', (data) => {
  console.log(`[SERVER STDOUT] ${data.trim()}`);
});

server.stderr.on('data', (data) => {
  console.log(`[SERVER STDERR] ${data.trim()}`);
});

// Give the server time to start
setTimeout(async () => {
  try {
    // Create a client to connect to the server
    console.log('Creating client...');
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['halopsa-mcp.js'],
      cwd: process.cwd()
    });
    
    const client = new Client();
    
    // Setup the client info before connecting
    client.clientInfo = {
      name: "HaloPSA Test Client",
      version: "1.0.0"
    };
    
    // Add required capabilities
    const capabilities = {
      models: ["*"],
      tools: {}
    };
    
    // Connect to the server with proper initialization parameters
    console.log('Connecting to server...');
    await client.connect(transport, {
      clientInfo: client.clientInfo,
      protocolVersion: "1.0",
      capabilities: capabilities
    });
    
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
    server.kill();
    process.exit(1);
  }
}, 2000);
