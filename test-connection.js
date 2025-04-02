#!/usr/bin/env node

/**
 * MCP Server Connection Test Script
 * Tests connection, tool registration, and basic functionality
 */

import { Client, StdioClientTransport } from 'fastmcp';

// Create logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`)
};

async function testConnection() {
  logger.info('Starting MCP Server connection test...');
  
  let client = null;
  let transport = null;
  
  try {
    // Create transport with debug logging
    logger.info('Creating transport...');
    transport = new StdioClientTransport({
      command: 'node',
      args: ['halopsa-mcp.js'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    });
    
    // Set up transport error handling
    transport.onerror = (error) => {
      logger.error(`Transport error: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    };
    
    // Create client with proper configuration
    logger.info('Creating client...');
    client = new Client({
      clientInfo: {
        name: "HaloPSA Test Client",
        version: "1.0.0"
      },
      capabilities: {
        models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229"],
        tools: {}
      }
    });
    
    // Set up client event handlers
    client.on('error', (error) => {
      logger.error(`Client error: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    });
    
    client.on('close', () => {
      logger.info('Client connection closed');
    });
    
    // Connect to the server
    logger.info('Connecting to MCP server...');
    await client.connect(transport);
    logger.info('Connected to server successfully');
    
    // Give server time to process connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test listing tools
    logger.info('Testing tools/list...');
    const tools = await client.listTools();
    logger.info(`Available tools: ${tools.tools.map(t => t.name).join(', ')}`);
    
    // Test healthcheck tool
    logger.info('Testing healthcheck tool...');
    const healthResult = await client.callTool({
      name: 'healthcheck',
      arguments: {}
    });
    
    if (healthResult.content && healthResult.content[0]) {
      const health = JSON.parse(healthResult.content[0].text);
      logger.info(`Health check result: ${JSON.stringify(health, null, 2)}`);
    }
    
    // Test getWorkflows tool
    logger.info('Testing getWorkflows tool...');
    const workflowsResult = await client.callTool({
      name: 'getWorkflows',
      arguments: {
        includeinactive: true
      }
    });
    
    if (workflowsResult.content && workflowsResult.content[0]) {
      const workflows = JSON.parse(workflowsResult.content[0].text);
      logger.info(`Retrieved ${Array.isArray(workflows) ? workflows.length : 'unknown number of'} workflows`);
    }
    
    // Close the client connection gracefully
    logger.info('Closing client connection...');
    await client.close();
    
    logger.info('Test completed successfully!');
    return 0;
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    return 1;
  } finally {
    // Ensure client is closed
    if (client) {
      try {
        await client.close();
      } catch (error) {
        logger.error(`Error closing client: ${error.message}`);
      }
    }
  }
}

// Run the test
testConnection().then(code => {
  process.exit(code);
}); 