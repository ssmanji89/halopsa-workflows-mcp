/**
 * HaloPSA Workflow MCP Server
 * A Model Context Protocol server for interacting with HaloPSA workflow API endpoints
 */
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import dotenv from 'dotenv';
import * as api from './api.js';

// Load environment variables
dotenv.config();

import { ConnectionStateManager, TimerManager, setupGracefulShutdown, withTimeout } from './utils.js';

// Define global variables for error throttling
declare global {
  var lastEpipeErrorTime: number | undefined;
  var lastTimeoutErrorTime: number | undefined;
  var disconnectionCount: number | undefined;
  var gc: (() => void) | undefined;
}

// Initialize globals
global.lastEpipeErrorTime = undefined;
global.lastTimeoutErrorTime = undefined;
global.disconnectionCount = 0;

// Helper function to format uptime in a human-readable way
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
}

// Create utility instances
const connectionState = new ConnectionStateManager();
const timerManager = new TimerManager();
let serverInstance: any = null;

// Enhanced error handling system
const handleError = (error: Error & { code?: string; context?: any }) => {
  // Check if it's an EPIPE error (broken pipe) or other connection error
  if (error.code === 'EPIPE' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
    connectionState.setConnected(false);
    
    // Prevent excessive logging by checking when the last error was logged
    const now = Date.now();
    if (!global.lastEpipeErrorTime || now - global.lastEpipeErrorTime > 5000) {
      console.error('[HANDLED] Client disconnected unexpectedly. This is normal when Claude Desktop is closed.');
      global.lastEpipeErrorTime = now;
    }
    
    // Clear any pending timers to avoid memory leaks
    timerManager.clearAll();
    return;
  }
  
  // Handle timeout errors
  if (error.message?.includes('timeout') || 
      (error.context?.error?.code === -32001) || 
      error.message?.includes('MCP error -32001') ||
      error.message?.includes('Request timed out')) {
    
    // Prevent excessive logging by checking when the last error was logged
    const now = Date.now();
    if (!global.lastTimeoutErrorTime || now - global.lastTimeoutErrorTime > 5000) {
      console.error('[HANDLED] Request timed out. This can happen when the client disconnects or the network is unstable.');
      global.lastTimeoutErrorTime = now;
    }
    
    // Mark client as potentially disconnected
    connectionState.setConnected(false);
    
    // Clear any pending timers to avoid memory leaks
    timerManager.clearAll();
    return;
  }
  
  // For other unhandled exceptions, log and don't crash the process in production
  console.error('[ERROR] Unhandled exception:', error);
  
  // Only exit in development environments
  if (process.env.NODE_ENV === 'development') {
    console.error('[INFO] Exiting process due to unhandled error in development mode');
    process.exit(1);
  }
};

// Register global error handlers
process.on('uncaughtException', handleError);
process.on('unhandledRejection', (reason) => {
  handleError(reason instanceof Error ? reason : new Error(String(reason)));
});

// Set up connection state event handlers
connectionState.onDisconnect(() => {
  global.disconnectionCount = (global.disconnectionCount || 0) + 1;
  
  console.error(`[INFO] Client disconnected (count: ${global.disconnectionCount}) - cleaning up resources`);
  timerManager.clearAll();
  
  // If we've had multiple disconnections in a short time, perform more aggressive cleanup
  if (global.disconnectionCount > 3) {
    console.error('[INFO] Multiple disconnections detected - performing deep cleanup');
    // Force garbage collection if available
    if (global.gc) {
      try {
        global.gc();
        console.error('[INFO] Manual garbage collection completed');
      } catch (err) {
        console.error('[ERROR] Error during forced garbage collection:', err);
      }
    }
    
    // Reset disconnection count after aggressive cleanup
    setTimeout(() => {
      global.disconnectionCount = 0;
    }, 60000); // Reset after 1 minute
  }
});

connectionState.onReconnect(() => {
  console.error('[INFO] Client reconnected - resuming normal operation');
  global.disconnectionCount = 0;
});

// Redirect all startup logs to stderr
console.error('[INFO] Starting HaloPSA Workflow MCP Server...');

// Setup graceful shutdown handler
setupGracefulShutdown(async () => {
  console.error('[INFO] Running cleanup tasks...');
  
  // Clean up timers
  timerManager.clearAll();
  
  // Clear connection handlers
  connectionState.clearHandlers();
  
  // Any server-specific cleanup
  if (serverInstance) {
    try {
      console.error('[INFO] Stopping MCP server...');
      // Any specific cleanup needed for the server
    } catch (err) {
      console.error('[ERROR] Error during server shutdown:', err);
    }
  }
  
  return Promise.resolve();
});

// Create the FastMCP server instance with enhanced configuration
const server = new FastMCP({
  name: 'HaloPSA Workflow Server',
  version: '1.0.0',
  // Only use supported options
  // The following commented options are not supported by FastMCP
  // requestTimeout: 30000, 
  // pingInterval: 5000,
  // retryOnDisconnect: true,
  // maxRetries: 3,
  // retryDelay: 1000,
  // keepAlive: true,
  // forceCleanDisconnect: true,
});

// Store the server instance for shutdown handling
serverInstance = server;

// Add a custom ping handler to detect client activity
// Not all FastMCP versions support this, so we use optional chaining
server.on?.('ping', () => {
  // Update connection state on ping
  if (!connectionState.isConnected) {
    console.error('[INFO] Received ping from client - reconnecting');
    connectionState.setConnected(true);
  }
});

// Use try-catch for error handling instead of .on('error')
// Since FastMCP doesn't support the 'error' event
try {
  // Add error handling logic in the execute methods instead
  console.error('[INFO] Server initialization complete');
} catch (error: any) {
  console.error('[ERROR] FastMCP server error:', error);
  
  // Update connection state if it's a connection error
  if (error.code === 'EPIPE' || 
      error.message?.includes('disconnected') || 
      error.message?.includes('connection')) {
    connectionState.setConnected(false);
  }
}

// Tool: Get Workflow Steps
server.addTool({
  name: 'getWorkflowSteps',
  description: 'Get a list of workflow steps from HaloPSA',
  parameters: z.object({
    includecriteriainfo: z.boolean().optional().describe('Include criteria information in the workflow steps'),
  }),
  execute: async (args) => {
    // Check connection state before executing
    if (!connectionState.isConnected) {
      console.error('[WARN] Client disconnected, but tool execution attempted');
      throw new Error('Client is disconnected');
    }
    
    // Use the utilities from utils.ts for more robust error handling
    try {
      // Use withTimeout utility to add timeout protection
      const workflowSteps = await withTimeout(
        api.getWorkflowSteps(args.includecriteriainfo),
        25000 // 25 second timeout
      );
      
      // Update connection state on successful response
      connectionState.setConnected(true);
      
      return JSON.stringify({
        success: true,
        data: workflowSteps,
        count: workflowSteps.length
      }, null, 2);
    } catch (error: any) {
      // Check if this is a timeout error
      if (error.message?.includes('timed out') || error.code === 'ETIMEDOUT') {
        console.error('[WARN] Request timed out while getting workflow steps');
        
        // Mark client as potentially disconnected
        connectionState.setConnected(false);
        throw new Error('Operation timed out. The client may be disconnected or HaloPSA API is not responding.');
      }
      
      // Check if client is disconnected
      if (!connectionState.isConnected) {
        console.error('[WARN] Error occurred but client already disconnected:', error);
        throw new Error('Client disconnected during operation');
      }
      
      console.error('[ERROR] Error getting workflow steps:', error);
      throw new Error(`Failed to get workflow steps: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Tool: Get Workflows
server.addTool({
  name: 'getWorkflows',
  description: 'Get a list of workflows from HaloPSA',
  parameters: z.object({
    access_control_level: z.number().optional().describe('Access control level for filtering'),
    includeinactive: z.boolean().optional().describe('Whether to include inactive workflows'),
  }),
  execute: async (args) => {
    try {
      const workflows = await api.getWorkflows({
        access_control_level: args.access_control_level,
        includeinactive: args.includeinactive,
      });
      return JSON.stringify({
        success: true,
        data: workflows,
        count: workflows.length
      }, null, 2);
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw new Error(`Failed to get workflows: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Tool: Create Workflows
server.addTool({
  name: 'createWorkflows',
  description: 'Create new workflows in HaloPSA',
  parameters: z.object({
    workflows: z.array(z.any()).describe('The workflows to create - array of workflow objects'),
  }),
  execute: async (args) => {
    try {
      const createdWorkflows = await api.createWorkflows(args.workflows);
      return JSON.stringify({
        success: true,
        data: createdWorkflows,
        count: createdWorkflows.length
      }, null, 2);
    } catch (error) {
      console.error('Error creating workflows:', error);
      throw new Error(`Failed to create workflows: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Tool: Get Workflow
server.addTool({
  name: 'getWorkflow',
  description: 'Get a single workflow from HaloPSA by ID',
  parameters: z.object({
    id: z.number().describe('The workflow ID'),
    includedetails: z.boolean().optional().describe('Include workflow details in the response'),
  }),
  execute: async (args) => {
    try {
      const workflow = await api.getWorkflow(args.id, args.includedetails);
      return JSON.stringify({
        success: true,
        data: workflow
      }, null, 2);
    } catch (error) {
      console.error(`Error getting workflow ${args.id}:`, error);
      throw new Error(`Failed to get workflow ${args.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Tool: Delete Workflow
server.addTool({
  name: 'deleteWorkflow',
  description: 'Delete a workflow from HaloPSA by ID',
  parameters: z.object({
    id: z.number().describe('The workflow ID to delete'),
  }),
  execute: async (args) => {
    try {
      await api.deleteWorkflow(args.id);
      return JSON.stringify({
        success: true,
        message: `Workflow ${args.id} deleted successfully`
      }, null, 2);
    } catch (error) {
      console.error(`Error deleting workflow ${args.id}:`, error);
      throw new Error(`Failed to delete workflow ${args.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Add a simple resource to provide server information
server.addResource({
  uri: 'info://server',
  name: 'Server Information',
  mimeType: 'text/plain',
  async load() {
    return {
      text: `HaloPSA Workflow MCP Server
Version: 1.0.0
Description: Provides tools for interacting with HaloPSA workflow management functionality
Available Tools:
- getWorkflowSteps: Get workflow steps
- getWorkflows: Get list of workflows
- createWorkflows: Create new workflows
- getWorkflow: Get a single workflow by ID
- deleteWorkflow: Delete a workflow by ID`
    };
  }
});

// Add server monitoring capabilities and diagnostic tools
const setupHealthCheck = () => {
  // Create an internal diagnostics resource that Claude can check
  server.addResource({
    uri: 'info://server/health',
    name: 'Server Health Information',
    mimeType: 'application/json',
    async load() {
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      
      return {
        text: JSON.stringify({
          status: 'active',
          uptime: {
            seconds: Math.floor(uptime),
            minutes: Math.floor(uptime / 60),
            hours: Math.floor(uptime / 3600),
            days: Math.floor(uptime / 86400)
          },
          memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
          },
          connection: {
            connected: connectionState.isConnected,
            disconnectionCount: global.disconnectionCount || 0,
            lastConnectedAgo: Math.round(connectionState.timeSinceConnected / 1000)
          },
          errors: {
            lastEpipeTime: global.lastEpipeErrorTime ? new Date(global.lastEpipeErrorTime).toISOString() : null,
            lastTimeoutTime: global.lastTimeoutErrorTime ? new Date(global.lastTimeoutErrorTime).toISOString() : null,
            errorCounts: global.errorCounts || {}
          },
          activeTimers: timerManager.count,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        }, null, 2)
      };
    }
  });
  
  // Add a diagnostic resource that Claude can use to check connection
  server.addResource({
    uri: 'info://server/ping',
    name: 'Server Ping Check',
    mimeType: 'application/json',
    async load() {
      // Update connection state when this resource is accessed
      connectionState.setConnected(true);
      
      return {
        text: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          message: 'Server is responding to ping requests'
        }, null, 2)
      };
    }
  });
  
  // Add a resource for system diagnostics
  server.addResource({
    uri: 'info://server/diagnostics',
    name: 'Server System Diagnostics',
    mimeType: 'application/json',
    async load() {
      // Get process info
      const processInfo = {
        pid: process.pid,
        platform: process.platform,
        version: process.version,
        versions: process.versions,
        arch: process.arch,
        cwd: process.cwd(),
        execPath: process.execPath,
        environment: process.env.NODE_ENV || 'development'
      };
      
      // Memory stats
      const memoryStats = {
        ...process.memoryUsage(),
        totalSystemMemory: 'N/A', // Would require os module
        freeSystemMemory: 'N/A'   // Would require os module
      };
      
      // Error stats
      const errorStats = {
        lastEpipeError: global.lastEpipeErrorTime ? new Date(global.lastEpipeErrorTime).toISOString() : null,
        lastTimeoutError: global.lastTimeoutErrorTime ? new Date(global.lastTimeoutErrorTime).toISOString() : null,
        disconnectionCount: global.disconnectionCount || 0,
        errorCounts: global.errorCounts || {}
      };
      
      // Timer stats
      const timerStats = {
        activeTimers: timerManager.count,
        // Add more timer stats here if available
      };
      
      // Connection stats
      const connectionStats = {
        isConnected: connectionState.isConnected,
        timeSinceConnected: connectionState.timeSinceConnected,
        // Add more connection stats here if available
      };
      
      return {
        text: JSON.stringify({
          timestamp: new Date().toISOString(),
          process: processInfo,
          memory: memoryStats,
          errors: errorStats,
          timers: timerStats,
          connection: connectionStats
        }, null, 2)
      };
    }
  });
  
  // Add a diagnostic tool for testing recovery
  server.addTool({
    name: 'diagnoseServer',
    description: 'Run a server diagnostic test and return the results',
    parameters: z.object({
      test_type: z.enum(['basic', 'connection', 'memory', 'all']).optional().describe('Type of diagnostic test to run')
    }),
    execute: async (args) => {
      const testType = args.test_type || 'basic';
      const results: any = {
        timestamp: new Date().toISOString(),
        test_type: testType,
        status: 'success'
      };
      
      // Basic test always runs
      results.uptime = {
        seconds: Math.floor(process.uptime()),
        formatted: formatUptime(process.uptime())
      };
      
      results.connection = {
        status: connectionState.isConnected ? 'connected' : 'disconnected',
        disconnection_count: global.disconnectionCount || 0,
        last_connected_ago: Math.round(connectionState.timeSinceConnected / 1000)
      };
      
      // Add memory tests
      if (testType === 'memory' || testType === 'all') {
        const memUsage = process.memoryUsage();
        results.memory = {
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
          heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          external_mb: Math.round(memUsage.external / 1024 / 1024),
          usage_percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        };
        
        // Run garbage collection if available
        if (global.gc) {
          try {
            global.gc();
            results.memory.gc_run = true;
            
            // Get memory usage after GC
            const afterGcMemUsage = process.memoryUsage();
            results.memory.after_gc = {
              heap_used_mb: Math.round(afterGcMemUsage.heapUsed / 1024 / 1024),
              freed_mb: Math.round((memUsage.heapUsed - afterGcMemUsage.heapUsed) / 1024 / 1024)
            };
          } catch (err) {
            results.memory.gc_error = `Failed to run garbage collection: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else {
          results.memory.gc_available = false;
        }
      }
      
      // Add all connection tests
      if (testType === 'connection' || testType === 'all') {
        results.errors = {
          last_epipe_time: global.lastEpipeErrorTime ? new Date(global.lastEpipeErrorTime).toISOString() : null,
          last_timeout_time: global.lastTimeoutErrorTime ? new Date(global.lastTimeoutErrorTime).toISOString() : null,
          error_counts: global.errorCounts || {}
        };
        
        results.active_timers = timerManager.count;
        
        // Reset connection state as a test
        if (!connectionState.isConnected) {
          connectionState.setConnected(true);
          results.connection_reset = true;
        }
      }
      
      return JSON.stringify(results, null, 2);
    }
  });
  
  // Create a reconnection handler that runs periodically
  timerManager.setInterval(() => {
    // If disconnected for over 5 minutes, attempt recovery actions
    if (!connectionState.isConnected && connectionState.timeSinceConnected > 300000) {
      console.error('[INFO] Long disconnection detected, performing recovery actions');
      
      // Clear any stale state
      timerManager.clearAll();
      
      // Reset connection for fresh start on next client connect
      console.error('[INFO] Ready for new client connection');
    }
  }, 60000, 'reconnection-handler'); // Check every minute
};

// Set up health check
setupHealthCheck();

// Create a watchdog timer to monitor overall server health
timerManager.setInterval(() => {
  const uptime = process.uptime();
  
  // Log status every 24 hours or every hour in development
  const shouldLog = 
    (process.env.NODE_ENV === 'development' && uptime > 3600 && Math.floor(uptime / 3600) % 1 === 0) || // Every hour in dev
    (uptime > 86400 && Math.floor(uptime / 86400) % 1 === 0);                                          // Every day in prod
    
  if (shouldLog) { 
    const timeUnit = uptime > 86400 ? 'days' : 'hours';
    const timeValue = uptime > 86400 ? Math.floor(uptime / 86400) : Math.floor(uptime / 3600);
    
    console.error(`[INFO] Watchdog status: Server running for ${timeValue} ${timeUnit}`);
    
    // Check memory usage to detect potential leaks
    const memUsage = process.memoryUsage();
    console.error('[INFO] Memory usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
    
    // Check connection state
    console.error('[INFO] Connection state:', {
      connected: connectionState.isConnected,
      disconnectionCount: global.disconnectionCount || 0,
      timeSinceLastConnection: `${Math.round(connectionState.timeSinceConnected / 1000 / 60)} minutes`
    });
    
    // Check active timers
    console.error('[INFO] Active timers:', timerManager.count);
    
    // Force garbage collection in development mode to keep memory usage low
    if (process.env.NODE_ENV === 'development' && global.gc) {
      try {
        global.gc();
        console.error('[INFO] Performed periodic garbage collection');
      } catch (err) {
        console.error('[ERROR] Error during forced garbage collection:', err);
      }
    }
  }
}, 3600000, 'server-watchdog'); // Check every hour

// Start with retry mechanism and exponential backoff
const startServer = async (retries = 5, delay = 2000) => {
  try {
    console.error('[INFO] Initializing server...');
    
    // Start with stdio transport
    await server.start({
      transportType: 'stdio'
    });
    
    // Reset error counters after successful start
    global.lastEpipeErrorTime = undefined;
    global.lastTimeoutErrorTime = undefined;
    global.disconnectionCount = 0;
    
    // Set connection state after successful start
    connectionState.setConnected(true);
    
    console.error('[INFO] HaloPSA Workflow MCP Server started successfully!');
  } catch (error: any) {
    // Handle startup errors
    if (error.code === 'EPIPE' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
      console.error('[HANDLED] Client disconnected during startup. This is normal when Claude Desktop is closed.');
      connectionState.setConnected(false);
      
      // In production, wait for a new client connection
      if (process.env.NODE_ENV === 'production') {
        console.error('[INFO] Server will wait for new client connection');
        // We don't retry here since we're waiting for a new client
        return;
      }
    } else if (retries > 0) {
      console.error(`[WARN] Failed to start server. Retrying in ${delay/1000} seconds... (${retries} retries left)`);
      console.error(`[DEBUG] Error details: ${error.message || 'No message'} (${error.code || 'No code'})`);
      
      // Wait with exponential backoff and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      return startServer(retries - 1, Math.min(delay * 1.5, 30000)); // Exponential backoff up to 30 seconds
    } else {
      console.error('[ERROR] Failed to start server after multiple attempts:', error);
      
      // In production, continue running to accept future connections
      if (process.env.NODE_ENV === 'production') {
        console.error('[INFO] Server will continue running to accept future connections');
        
        // Set up a periodic restart attempt in production
        setInterval(() => {
          console.error('[INFO] Attempting to restart server after previous failures...');
          startServer(3, 5000)
            .catch(err => console.error('[ERROR] Restart attempt failed:', err));
        }, 300000); // Try every 5 minutes
      } else {
        process.exit(1);
      }
    }
  }
};

// Initialize server
startServer().catch(error => {
  console.error('[FATAL] Unexpected error during server startup:', error);
  process.exit(1);
});

// Keep the process alive even if server fails to start in production
if (process.env.NODE_ENV === 'production') {
  process.stdin.resume();
  console.error('[INFO] Server running in production mode - will stay alive to handle reconnections');
}
