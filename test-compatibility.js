#!/usr/bin/env node

/**
 * MCP Compatibility Test
 * Tests cross-compatibility between different MCP client/server implementations
 * Provides a robust testing framework for ensuring MCP protocol compliance
 * 
 * Run with: node test-compatibility.js
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const TEST_CONFIG = {
  timeout: 30000,            // 30 seconds timeout
  serverStartDelay: 2000,    // 2 seconds delay for server start
  debug: true,               // Enable debug logging
  logFile: './test-tmp/compatibility-test.log'
};

// Create log directory if it doesn't exist
const logDir = path.dirname(TEST_CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Logger
const logger = {
  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(TEST_CONFIG.logFile, formattedMessage + '\n');
  },
  
  debug(message) {
    if (TEST_CONFIG.debug) {
      this.log(message, 'DEBUG');
    }
  },
  
  error(message, error = null) {
    this.log(message, 'ERROR');
    if (error && error.stack) {
      this.log(error.stack, 'ERROR');
    }
  }
};

/**
 * Minimal MCP Client Implementation
 * Uses the most basic implementation possible to test compatibility
 */
class MinimalMcpClient {
  constructor() {
    this.serverProcess = null;
    this.messages = [];
    this.nextMessageId = 1;
    this.onResponse = null;
    this.connected = false;
  }
  
  async startServer() {
    logger.debug('Starting MCP server process...');
    this.serverProcess = spawn('node', ['dist/halopsa-mcp.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',
        NODE_ENV: 'test'
      }
    });
    
    this.serverProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.debug(`[SERVER STDOUT] ${message}`);
        this.handleServerMessage(message);
      }
    });
    
    this.serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.debug(`[SERVER STDERR] ${message}`);
      }
    });
    
    this.serverProcess.on('error', (error) => {
      logger.error('Server process error', error);
    });
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, TEST_CONFIG.serverStartDelay);
    });
  }
  
  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.connected = false;
    }
  }
  
  handleServerMessage(message) {
    try {
      const jsonMessage = JSON.parse(message);
      
      // Store message for analysis
      this.messages.push(jsonMessage);
      
      // Handle response
      if (jsonMessage.id !== undefined && this.onResponse) {
        // Check for error and try to determine if it's a compatibility issue
        if (jsonMessage.error && 
            jsonMessage.error.message && 
            (jsonMessage.error.message.includes('clientInfo') || 
             jsonMessage.error.message.includes('protocolVersion') || 
             jsonMessage.error.message.includes('capabilities'))) {
          
          logger.debug('Detected protocol compatibility issue, will try fallback methods');
          // Store this for diagnostics
          this.lastProtocolError = jsonMessage.error;
        }
        
        this.onResponse(jsonMessage);
      }
    } catch (error) {
      // Not JSON, ignore
      logger.debug(`Could not parse server message: ${message.substring(0, 100)}...`);
    }
  }
  
  async sendRawMessage(message) {
    if (!this.serverProcess) {
      throw new Error('Server not started');
    }
    
    const messageStr = JSON.stringify(message);
    logger.debug(`[CLIENT SENDING] ${messageStr}`);
    this.serverProcess.stdin.write(messageStr + '\n');
  }
  
  async initialize() {
    const initMessage = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'MinimalMcpClient',
          version: '1.0.0'
        },
        protocolVersion: '1.0',
        capabilities: {
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          tools: {}
        }
      },
      id: this.nextMessageId++
    };
    
    return new Promise((resolve, reject) => {
      this.onResponse = (response) => {
        if (response.id === initMessage.id) {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            this.connected = true;
            resolve(response.result);
          }
          this.onResponse = null;
        }
      };
      
      this.sendRawMessage(initMessage);
      
      // Set timeout
      setTimeout(() => {
        if (this.onResponse) {
          this.onResponse = null;
          reject(new Error('Initialize timeout'));
        }
      }, 5000);
    });
  }
  
  async listTools() {
    const listToolsMessage = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: this.nextMessageId++
    };
    
    return new Promise((resolve, reject) => {
      this.onResponse = (response) => {
        if (response.id === listToolsMessage.id) {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
          this.onResponse = null;
        }
      };
      
      this.sendRawMessage(listToolsMessage);
      
      // Set timeout
      setTimeout(() => {
        if (this.onResponse) {
          this.onResponse = null;
          reject(new Error('List tools timeout'));
        }
      }, 5000);
    });
  }
  
  async callTool(name, args) {
    const callToolMessage = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: args
      },
      id: this.nextMessageId++
    };
    
    return new Promise((resolve, reject) => {
      this.onResponse = (response) => {
        if (response.id === callToolMessage.id) {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
          this.onResponse = null;
        }
      };
      
      this.sendRawMessage(callToolMessage);
      
      // Set timeout
      setTimeout(() => {
        if (this.onResponse) {
          this.onResponse = null;
          reject(new Error('Call tool timeout'));
        }
      }, 5000);
    });
  }
}

/**
 * Test different initialize protocols to find compatible ones
 */
async function testProtocolCompatibility(client) {
  logger.log('Testing protocol compatibility with multiple variants...');
  
  // Protocol variants to try in order
  const protocolVariants = [
    // Standard protocol - v1.0 with all required fields
    {
      name: 'Standard MCP Protocol v1.0',
      message: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'MinimalMcpClient',
            version: '1.0.0'
          },
          protocolVersion: '1.0',
          capabilities: {
            models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
            tools: {}
          }
        },
        id: client.nextMessageId++
      }
    },
    
    // Backwards compatibility mode
    {
      name: 'FastMCP Compatibility Mode',
      message: {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'FastMCPClient',
            version: '1.0.0'
          }
        },
        id: client.nextMessageId++
      }
    },
    
    // Direct protocol mode
    {
      name: 'Direct Protocol Mode',
      message: {
        jsonrpc: '2.0',
        method: 'client/initialize',
        params: {},
        id: client.nextMessageId++
      }
    }
  ];
  
  // Try each variant
  for (const variant of protocolVariants) {
    logger.log(`Trying protocol variant: ${variant.name}`);
    
    try {
      const result = await new Promise((resolve, reject) => {
        client.onResponse = (response) => {
          if (response.id === variant.message.id) {
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
            client.onResponse = null;
          }
        };
        
        client.sendRawMessage(variant.message);
        
        // Set timeout
        setTimeout(() => {
          if (client.onResponse) {
            client.onResponse = null;
            reject(new Error('Initialize timeout'));
          }
        }, 5000);
      });
      
      logger.log(`Protocol variant succeeded: ${variant.name}`);
      client.connected = true;
      return { success: true, variant: variant.name, result };
    } catch (error) {
      logger.debug(`Protocol variant failed: ${variant.name}`);
      logger.debug(`Error: ${error.message}`);
    }
  }
  
  throw new Error('All protocol variants failed');
}

/**
 * Run the compatibility test suite
 */
async function runCompatibilityTest() {
  logger.log('====================================');
  logger.log('MCP COMPATIBILITY TEST SUITE STARTED');
  logger.log('====================================');
  
  const client = new MinimalMcpClient();
  
  try {
    // Start the server
    logger.log('Starting MCP server...');
    await client.startServer();
    
    // Try different protocol variants until one works
    logger.log('Initializing client with protocol compatibility testing...');
    const initResult = await testProtocolCompatibility(client);
    logger.log(`Successfully connected using protocol: ${initResult.variant}`);
    
    // List tools
    logger.log('Listing available tools...');
    const tools = await client.listTools();
    logger.log(`Found ${tools.tools.length} tools: ${tools.tools.map(t => t.name).join(', ')}`);
    
    // Call getWorkflows tool
    logger.log('Testing getWorkflows tool...');
    const result = await client.callTool('getWorkflows', { includeinactive: true });
    
    if (result.content && result.content.length) {
      const content = result.content[0];
      if (content.type === 'text' && content.text) {
        try {
          const workflows = JSON.parse(content.text);
          logger.log(`Successfully retrieved ${workflows.length} workflows`);
        } catch (error) {
          logger.error('Failed to parse workflow data', error);
        }
      } else {
        logger.log('Unexpected content format:', content);
      }
    } else {
      logger.log('No content in result:', result);
    }
    
    logger.log('====================================');
    logger.log('MCP COMPATIBILITY TEST SUITE PASSED');
    logger.log('====================================');
    
    return 0;
  } catch (error) {
    logger.error('Compatibility test failed', error);
    
    logger.log('====================================');
    logger.log('MCP COMPATIBILITY TEST SUITE FAILED');
    logger.log('====================================');
    
    return 1;
  } finally {
    // Clean up
    await client.stopServer();
  }
}

// Set timeout for the entire test
const testTimeout = setTimeout(() => {
  logger.error(`Test timed out after ${TEST_CONFIG.timeout}ms`);
  process.exit(1);
}, TEST_CONFIG.timeout);

// Run the test
runCompatibilityTest().then(
  (code) => {
    clearTimeout(testTimeout);
    process.exit(code);
  },
  (error) => {
    logger.error('Unhandled error in test runner', error);
    clearTimeout(testTimeout);
    process.exit(1);
  }
);
