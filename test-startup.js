/**
 * Test script to verify MCP server startup
 */
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Launch the MCP server
console.log('Starting MCP server...');
const server = spawn('bash', ['start.sh'], {
  cwd: __dirname,
  stdio: 'pipe'
});

// Send a test message
const testMessage = {
  jsonrpc: '2.0',
  id: '1',
  method: 'query_server_info',
  params: {}
};

// Add timeouts and error handling
let responseReceived = false;
let timeoutId = null;

// Handle server stdout
server.stdout.on('data', (data) => {
  console.log(`Server stdout: ${data}`);
  
  try {
    // Try to parse response as JSON
    const response = JSON.parse(data.toString());
    console.log('Received JSON response:', response);
    responseReceived = true;
    
    // Shutdown after successful test
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    console.log('Test successful, shutting down server...');
    server.kill('SIGTERM');
  } catch (err) {
    console.log('Not JSON data, continuing...');
  }
});

// Handle server stderr
server.stderr.on('data', (data) => {
  console.log(`Server stderr: ${data}`);
});

// Handle server exit
server.on('exit', (code, signal) => {
  console.log(`Server exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

// Send test message after a short delay
setTimeout(() => {
  console.log('Sending test message:', testMessage);
  try {
    server.stdin.write(JSON.stringify(testMessage) + '\n');
  } catch (err) {
    console.error('Error sending test message:', err);
    server.kill('SIGTERM');
  }
}, 2000);

// Set timeout for server response
timeoutId = setTimeout(() => {
  console.log('No response received within timeout, shutting down server...');
  server.kill('SIGTERM');
}, 10000);

// Handle process signals
process.on('SIGINT', () => {
  console.log('Caught SIGINT, shutting down server...');
  server.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  console.log('Caught SIGTERM, shutting down server...');
  server.kill('SIGTERM');
});
