#!/usr/bin/env node

/**
 * Direct connectivity test for HaloPSA Workflows MCP Server
 * Tests compatibility with various MCP implementations
 */

import { execSync } from 'child_process';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  serverTimeout: 15000,  // 15 seconds
  clientTimeout: 10000,  // 10 seconds
  serverStartupDelay: 2000,  // 2 seconds
  logFile: path.join(process.cwd(), 'test-tmp', 'direct-connect-test.log'),
  debug: true
};

// Set up logging
const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Logging function
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${type}] ${message}`;
  
  console.log(formattedMessage);
  
  try {
    fs.appendFileSync(CONFIG.logFile, formattedMessage + '\n');
  } catch (error) {
    console.error(`[ERROR] Failed to write to log file: ${error.message}`);
  }
}

// Debug log function
function debug(message) {
  if (CONFIG.debug) {
    log(message, 'DEBUG');
  }
}

// Error log function
function error(message, err = null) {
  log(message, 'ERROR');
  
  if (err && err.stack) {
    log(err.stack, 'ERROR');
  }
}

// Function to ensure environment is properly set up
function checkEnvironment() {
  debug('Checking environment...');
  
  // Check if node is installed
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    debug(`Node.js version: ${nodeVersion}`);
  } catch (err) {
    error('Node.js is not installed or not in PATH', err);
    process.exit(1);
  }
  
  // Check if npm is installed
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    debug(`npm version: ${npmVersion}`);
  } catch (err) {
    error('npm is not installed or not in PATH', err);
    process.exit(1);
  }
  
  // Check if the code is built
  if (!fs.existsSync(path.join(process.cwd(), 'dist', 'halopsa-mcp.js'))) {
    log('Building the project...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      debug('Build successful');
    } catch (err) {
      error('Failed to build the project', err);
      process.exit(1);
    }
  }
  
  // Check for .env file
  if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
    log('No .env file found, creating from example...');
    try {
      const exampleEnv = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
      fs.writeFileSync(path.join(process.cwd(), '.env'), exampleEnv);
      debug('.env file created');
    } catch (err) {
      error('Failed to create .env file', err);
      // Continue anyway as this might not be critical
    }
  }
  
  debug('Environment check complete');
}

// Function to start the MCP server
function startServer() {
  debug('Starting MCP server...');
  
  const server = spawn('node', ['dist/halopsa-mcp.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LOG_LEVEL: 'debug',
      NODE_ENV: 'test'
    }
  });
  
  server.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      debug(`[SERVER STDOUT] ${output}`);
    }
  });
  
  server.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      debug(`[SERVER STDERR] ${output}`);
    }
  });
  
  server.on('error', (err) => {
    error('Server process error', err);
  });
  
  server.on('close', (code) => {
    debug(`Server process exited with code ${code}`);
  });
  
  return server;
}

// Function to test direct connectivity using curl
async function testDirectConnectivity() {
  debug('Testing direct connectivity with curl...');
  
  try {
    // Prepare curl command to test HTTP-based protocol if MCP server supports it
    const curlCommand = `curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' http://localhost:3000/v1/mcp 2>/dev/null || echo "MCP server not supporting HTTP"`;
    
    const result = execSync(curlCommand, { timeout: 5000 }).toString().trim();
    debug(`Curl test result: ${result}`);
    
    if (result.includes('not supporting')) {
      debug('MCP server does not support HTTP connections - this is normal for stdio-only servers');
      return false;
    }
    
    try {
      const parsedResult = JSON.parse(result);
      if (parsedResult.result && parsedResult.result.tools) {
        log('Direct HTTP connectivity test: SUCCESS');
        debug(`Found ${parsedResult.result.tools.length} tools`);
        return true;
      }
    } catch (parseErr) {
      debug('Failed to parse JSON response from curl test');
    }
  } catch (err) {
    debug('Curl test failed, server likely does not support HTTP connections');
  }
  
  return false;
}

// Main test function
async function runTest() {
  log('Starting direct connectivity test...');
  
  // Check environment
  checkEnvironment();
  
  // Start server
  const server = startServer();
  
  // Wait for server to start
  debug(`Waiting ${CONFIG.serverStartupDelay}ms for server to start...`);
  await new Promise(resolve => setTimeout(resolve, CONFIG.serverStartupDelay));
  
  try {
    // Test direct connectivity
    const hasHttpConnectivity = await testDirectConnectivity();
    
    if (!hasHttpConnectivity) {
      log('Server uses stdio transport only (standard for MCP servers)');
    }
    
    // Test stdio client connectivity
    log('Testing fastmcp-client connectivity...');
    execSync('node test-fastmcp-client.js', { 
      stdio: 'inherit',
      timeout: CONFIG.clientTimeout
    });
    
    log('FastMCP client test: SUCCESS');
    
    // Test direct FastMCP connectivity
    log('Testing direct FastMCP connectivity...');
    execSync('node test-fastmcp.js', { 
      stdio: 'inherit',
      timeout: CONFIG.clientTimeout
    });
    
    log('Direct FastMCP test: SUCCESS');
    
    log('All connectivity tests passed!');
    return 0;
  } catch (err) {
    error('Test failed', err);
    return 1;
  } finally {
    // Terminate server
    debug('Terminating server process...');
    server.kill();
  }
}

// Set up timeout
const timeout = setTimeout(() => {
  error(`Test timed out after ${CONFIG.serverTimeout}ms`);
  process.exit(1);
}, CONFIG.serverTimeout);

// Run test
runTest().then(
  (exitCode) => {
    clearTimeout(timeout);
    process.exit(exitCode);
  },
  (err) => {
    error('Unhandled error in test', err);
    clearTimeout(timeout);
    process.exit(1);
  }
);
