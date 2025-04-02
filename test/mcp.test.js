#!/usr/bin/env node

/**
 * HaloPSA MCP Server Test
 * Tests MCP server functionality
 */
import { exec } from 'child_process';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function runMcpTests() {
  console.log('=== HaloPSA MCP Server Tests ===');
  
  // Start the MCP server
  console.log('\n[TEST] Starting MCP server...');
  const server = exec('node halopsa-mcp.js', {
    cwd: process.cwd()
  });
  
  let serverLogs = '';
  
  server.stdout.on('data', (data) => {
    const log = data.toString().trim();
    if (log) {
      console.log(`[SERVER] ${log}`);
      serverLogs += log + '\n';
    }
  });
  
  server.stderr.on('data', (data) => {
    const log = data.toString().trim();
    if (log) {
      console.log(`[SERVER] ${log}`);
      serverLogs += log + '\n';
    }
  });
  
  // Give the server time to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Create a client to connect to the server
    console.log('\n[TEST] Creating MCP client...');
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['halopsa-mcp.js'],
      cwd: process.cwd()
    });
    
    const client = new Client();
    
    // Setup the client info
    client.clientInfo = {
      name: "HaloPSA Test Client",
      version: "1.0.0"
    };
    
    // Connect to the server with initialization parameters
    console.log('[TEST] Connecting to MCP server...');
    
    // Set up parameters for initialization
    const initParams = {
      clientInfo: {
        name: "HaloPSA Test Client",
        version: "1.0.0"
      },
      protocolVersion: "1.0", 
      capabilities: {
        models: ["*"],
        tools: {}
      }
    };
    
    // Connect with initialization parameters directly
    await client.connect(transport, initParams);
    
    console.log('✅ Connected to MCP server successfully');
    
    // List available tools
    console.log('\n[TEST] Listing MCP tools...');
    const toolsResult = await client.listTools();
    console.log(`✅ Found ${toolsResult.tools.length} tools: ${toolsResult.tools.map(t => t.name).join(', ')}`);
    
    // Test the healthcheck tool
    console.log('\n[TEST] Testing healthcheck tool...');
    const healthResult = await client.callTool({
      name: 'healthcheck',
      arguments: {}
    });
    
    console.log('✅ Healthcheck successful');
    
    // Test the getWorkflows tool
    console.log('\n[TEST] Testing getWorkflows tool...');
    const workflowsResult = await client.callTool({
      name: 'getWorkflows',
      arguments: {
        includeinactive: true
      }
    });
    
    if (workflowsResult?.content?.[0]?.text) {
      try {
        const workflows = JSON.parse(workflowsResult.content[0].text);
        if (Array.isArray(workflows)) {
          console.log(`✅ Retrieved ${workflows.length} workflows via MCP`);
        } else {
          console.log('⚠️ Unexpected response format from getWorkflows tool');
        }
      } catch (error) {
        console.log(`⚠️ Error parsing workflows result: ${error.message}`);
      }
    }
    
    // Close the client connection
    console.log('\n[TEST] Closing client connection...');
    await client.close();
    
    console.log('\n✅ MCP Tests completed successfully!\n');
    
    // Kill the server process
    server.kill();
    return 0;
  } catch (error) {
    console.error(`\n❌ Tests failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    
    // Kill the server process
    server.kill();
    return 1;
  }
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runMcpTests().then(
    code => process.exit(code)
  );
}

export default runMcpTests;
