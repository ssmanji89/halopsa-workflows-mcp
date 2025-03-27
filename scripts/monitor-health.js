#!/usr/bin/env node
/**
 * MCP Server Health Monitor
 * Script to monitor the health of the MCP server process
 * Can be used to automatically restart the server if it becomes unresponsive
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Configuration
const LOG_FILE = path.join(os.homedir(), 'Library/Logs/Claude/mcp-server-halopsa-workflow.log');
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_COOLDOWN = 300000; // 5 minutes
const ERROR_PATTERNS = [
  { pattern: /EPIPE/i, count: 10, timeWindow: 60000 }, // 10 EPIPE errors in 1 minute
  { pattern: /ERR_UNHANDLED_ERROR/i, count: 5, timeWindow: 60000 }, // 5 unhandled errors in 1 minute
  { pattern: /Request timed out/i, count: 8, timeWindow: 120000 }, // 8 timeouts in 2 minutes
];

// State tracking
let restartAttempts = 0;
let lastRestartTime = 0;
let isServerRunning = false;
let serverProcess = null;

// Error tracking
const recentErrors = [];

// Main monitoring function
function startMonitoring() {
  console.log('Starting HaloPSA Workflow MCP Server health monitor...');
  checkServerHealth();
  
  // Set up regular health checks
  setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);
}

// Check if server is running and responsive
function checkServerHealth() {
  console.log(`[${new Date().toISOString()}] Checking server health...`);
  
  // Check server process
  exec('ps aux | grep "halopsa-workflows-mcp" | grep -v grep', (error, stdout, stderr) => {
    const wasRunning = isServerRunning;
    isServerRunning = !error && stdout.trim() !== '';
    
    if (!isServerRunning && wasRunning) {
      console.log('Server process not found! Server may have crashed.');
      handleServerFailure('process_not_found');
      return;
    }
    
    // Check log file for error patterns
    checkLogFileForErrors();
  });
}

// Check log file for error patterns
function checkLogFileForErrors() {
  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading log file: ${err.message}`);
      return;
    }
    
    // Get the last 100 lines or so
    const lines = data.split('\n').slice(-500);
    
    // Look for errors in recent log entries
    const now = Date.now();
    
    for (const line of lines) {
      // Skip lines that don't contain stack traces
      if (!line.includes('Error:') && !line.includes('EXCEPTION:')) {
        continue;
      }
      
      // Process each error pattern
      for (const pattern of ERROR_PATTERNS) {
        if (pattern.pattern.test(line)) {
          // Add to recent errors with timestamp
          recentErrors.push({
            type: pattern.pattern.toString(),
            timestamp: now
          });
          
          // Clean up old errors outside the time window
          const relevantErrors = recentErrors.filter(e => 
            e.type === pattern.pattern.toString() && 
            (now - e.timestamp) <= pattern.timeWindow
          );
          
          // Check if threshold exceeded
          if (relevantErrors.length >= pattern.count) {
            console.log(`Error threshold exceeded for pattern: ${pattern.pattern}`);
            console.log(`${relevantErrors.length} errors in the last ${pattern.timeWindow/1000} seconds`);
            handleServerFailure('error_threshold');
            return;
          }
        }
      }
    }
    
    // Clean up old errors
    const oldestValidTime = now - Math.max(...ERROR_PATTERNS.map(p => p.timeWindow));
    while (recentErrors.length > 0 && recentErrors[0].timestamp < oldestValidTime) {
      recentErrors.shift();
    }
    
    console.log(`[${new Date().toISOString()}] Server appears healthy. Monitoring ${recentErrors.length} recent errors.`);
  });
}

// Handle server failure detection
function handleServerFailure(reason) {
  console.log(`Server failure detected! Reason: ${reason}`);
  
  // Check if we can restart
  const now = Date.now();
  if (now - lastRestartTime < RESTART_COOLDOWN) {
    console.log(`Restart cooldown in effect. Next restart available in ${Math.ceil((RESTART_COOLDOWN - (now - lastRestartTime))/1000)} seconds.`);
    return;
  }
  
  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.log(`Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Please check the server manually.`);
    return;
  }
  
  // Attempt to restart the server
  restartServer();
}

// Restart the server
function restartServer() {
  console.log(`Attempting to restart server (attempt ${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})...`);
  
  // Kill existing process if any
  if (isServerRunning) {
    exec('pkill -f "halopsa-workflows-mcp"', (error) => {
      if (error) {
        console.error(`Error stopping existing process: ${error.message}`);
      } else {
        console.log('Existing process terminated successfully.');
      }
      
      // Start new process after a short delay
      setTimeout(startNewServerProcess, 5000);
    });
  } else {
    startNewServerProcess();
  }
}

// Start a new server process
function startNewServerProcess() {
  // Get project root directory
  const projectRoot = path.resolve(__dirname, '..');
  
  console.log(`Starting new server process from ${projectRoot}...`);
  
  // Execute the restart script
  exec('npm run restart', { cwd: projectRoot }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting new process: ${error.message}`);
      console.error(stderr);
    } else {
      console.log('Server restarted successfully!');
      console.log(stdout);
      
      // Update tracking
      restartAttempts++;
      lastRestartTime = Date.now();
      isServerRunning = true;
    }
  });
}

// Start monitoring
startMonitoring();

// Handle script termination
process.on('SIGINT', () => {
  console.log('Monitor shutting down...');
  process.exit(0);
});
