#!/usr/bin/env node

/**
 * HaloPSA MCP Server
 * Wrapper around the direct HaloPSA API implementation
 * Improved with connection handling, error recovery, and enhanced SSE logging
 */
import { FastMCP } from 'fastmcp';
import {
  getAuthToken,
  getWorkflows,
  getWorkflowSteps,
  getWorkflow,
  deleteWorkflow,
  createWorkflows
} from './halopsa-direct.js';

// Set up logging configuration
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const debug = LOG_LEVEL === 'debug';

/**
 * Enhanced logging system that supports both console and SSE
 * This allows for detailed, structured logging via SSE to clients
 */
const createLogger = (session) => {
  // Base console logger
  const consoleLogger = {
    debug: (message, data = {}) => {
      if (debug) console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    },
    info: (message, data = {}) => console.error(`[INFO] ${message}`, data ? JSON.stringify(data) : ''),
    warn: (message, data = {}) => console.error(`[WARN] ${message}`, data ? JSON.stringify(data) : ''),
    error: (message, data = {}) => console.error(`[ERROR] ${message}`, data ? JSON.stringify(data) : '')
  };

  // If we have a session, create a session logger that also sends via SSE
  if (session) {
    return {
      debug: (message, data = {}) => {
        consoleLogger.debug(message, data);
        if (session && session.server) {
          try {
            session.log?.debug?.(message, data);
          } catch (error) {
            consoleLogger.debug(`Failed to send SSE log: ${error.message}`);
          }
        }
      },
      info: (message, data = {}) => {
        consoleLogger.info(message, data);
        if (session && session.server) {
          try {
            session.log?.info?.(message, data);
          } catch (error) {
            consoleLogger.debug(`Failed to send SSE log: ${error.message}`);
          }
        }
      },
      warn: (message, data = {}) => {
        consoleLogger.warn(message, data);
        if (session && session.server) {
          try {
            session.log?.warn?.(message, data);
          } catch (error) {
            consoleLogger.debug(`Failed to send SSE log: ${error.message}`);
          }
        }
      },
      error: (message, data = {}) => {
        consoleLogger.error(message, data);
        if (session && session.server) {
          try {
            session.log?.error?.(message, data);
          } catch (error) {
            consoleLogger.debug(`Failed to send SSE log: ${error.message}`);
          }
        }
      }
    };
  }

  // No session, return console logger
  return consoleLogger;
};

// Create the base logger (no session yet)
const logger = createLogger();

// Create a new MCP server with enhanced capabilities
const mcp = new FastMCP({
  name: 'halopsa-workflows',
  description: 'HaloPSA Workflows MCP Server',
  models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620', 'claude-3-sonnet', 'claude-3-opus', 'claude-3-haiku', 'claude-3-5-sonnet'],
  // Match server configuration and add stability options
  connectionTimeout: 120000,  // 2 minutes
  reconnectDelay: 5000,      // 5 seconds
  stableConnections: true,    // Enable stable connections
  keepAlive: true,           // Enable keepalive
  maxReconnectAttempts: 5,   // Allow multiple reconnection attempts
  heartbeatInterval: 30000,  // Send heartbeat every 30 seconds
  // Add capabilities configuration
  capabilities: {
    tools: {
      getWorkflows: true,
      getWorkflowSteps: true,
      getWorkflow: true,
      deleteWorkflow: true,
      createWorkflows: true
    },
    logging: {
      debug: true,
      info: true,
      warn: true,
      error: true
    }
  }
});

// Set up connection event handlers with enhanced logging
mcp.on('connect', ({ session }) => {
  // Create a session-specific logger
  const sessionLogger = createLogger(session);
  
  // Store session start time for metrics
  const sessionStartTime = new Date();
  
  // Generate a unique session ID if not provided
  const sessionId = session.server.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  session.server.sessionId = sessionId;
  
  // Log connection with metadata
  sessionLogger.info(`New client connected`, {
    sessionId,
    startTime: sessionStartTime.toISOString(),
    clientInfo: session.clientCapabilities?.clientInfo || 'Unknown client',
    transportType: 'stdio',
    capabilities: mcp.capabilities
  });
  
  // Send welcome message using proper method
  try {
    session.sendMessage({
      role: 'tool',
      content: [{ 
        type: 'text', 
        text: 'Connected to HaloPSA Workflows MCP Server' 
      }]
    }).catch((error) => {
      sessionLogger.debug(`Failed to send welcome message: ${error.message}`);
    });
  } catch (error) {
    sessionLogger.debug(`Failed to create welcome message: ${error.message}`);
  }
  
  // Handle session-specific events with retry logic
  session.on('error', async (error) => {
    sessionLogger.warn(`Session error occurred`, {
      sessionId,
      error: error.error?.message || 'Unknown error',
      errorCode: error.error?.code,
      timestamp: new Date().toISOString()
    });

    // Attempt to recover from certain errors
    if (error.error?.code === 'ECONNRESET' || error.error?.code === 'ETIMEDOUT') {
      try {
        await session.reconnect();
        sessionLogger.info(`Successfully reconnected after error`);
      } catch (reconnectError) {
        sessionLogger.error(`Failed to reconnect: ${reconnectError.message}`);
      }
    }
  });
  
  // Log capability information
  sessionLogger.debug(`Client capabilities`, {
    sessionId,
    capabilities: session.clientCapabilities || {},
    loggingLevel: session.loggingLevel || 'unknown'
  });
  
  // Set up keepalive ping with error handling
  const keepAliveInterval = setInterval(() => {
    try {
      if (session && session.server) {
        session.ping();
      } else {
        clearInterval(keepAliveInterval);
        sessionLogger.warn(`Keepalive interval cleared - session no longer valid`);
      }
    } catch (error) {
      sessionLogger.debug(`Keepalive ping failed: ${error.message}`);
      clearInterval(keepAliveInterval);
    }
  }, 30000); // Send ping every 30 seconds
  
  // Clean up on session close
  session.on('close', () => {
    clearInterval(keepAliveInterval);
    sessionLogger.info(`Session closed`, {
      sessionId,
      duration: Date.now() - sessionStartTime.getTime()
    });
  });
});

mcp.on('disconnect', ({ session }) => {
  const sessionLogger = createLogger(session);
  
  // Calculate session duration
  const sessionEndTime = new Date();
  
  sessionLogger.info(`Client disconnected`, {
    sessionId: session.server.sessionId,
    endTime: sessionEndTime.toISOString()
  });
});

mcp.on('error', (error) => {
  logger.error(`Server error occurred`, {
    error: error.message || 'Unknown error',
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

// Add tools
mcp.addTool({
  name: 'getWorkflows',
  description: 'Get a list of workflows from HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      includeinactive: {
        type: 'boolean',
        description: 'Whether to include inactive workflows'
      }
    }
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflows (includeinactive=${params?.includeinactive || false})`);
      const workflows = await getWorkflows(params?.includeinactive);
      log.info(`Retrieved ${workflows.length} workflows`);
      return { 
        type: 'text',
        text: JSON.stringify(workflows, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflows: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'getWorkflowSteps',
  description: 'Get a list of workflow steps from HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      includecriteriainfo: {
        type: 'boolean',
        description: 'Include criteria information in the workflow steps'
      }
    }
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflow steps (includecriteriainfo=${params?.includecriteriainfo || false})`);
      const steps = await getWorkflowSteps(params?.includecriteriainfo);
      log.info(`Retrieved ${steps.length} workflow steps`);
      return {
        type: 'text',
        text: JSON.stringify(steps, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflow steps: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'getWorkflow',
  description: 'Get a single workflow from HaloPSA by ID',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The workflow ID'
      },
      includedetails: {
        type: 'boolean',
        description: 'Include workflow details in the response'
      }
    },
    required: ['id']
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Fetching workflow ${params.id} (includedetails=${params?.includedetails || false})`);
      const workflow = await getWorkflow(params.id, params?.includedetails);
      log.info(`Retrieved workflow ${params.id}`);
      return {
        type: 'text',
        text: JSON.stringify(workflow, null, 2)
      };
    } catch (error) {
      log.error(`Failed to get workflow ${params.id}: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'deleteWorkflow',
  description: 'Delete a workflow from HaloPSA by ID',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The workflow ID to delete'
      }
    },
    required: ['id']
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Deleting workflow ${params.id}`);
      await deleteWorkflow(params.id);
      log.info(`Successfully deleted workflow ${params.id}`);
      return {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Successfully deleted workflow ${params.id}`
        }, null, 2)
      };
    } catch (error) {
      log.error(`Failed to delete workflow ${params.id}: ${error.message}`);
      return {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2)
      };
    }
  }
});

mcp.addTool({
  name: 'createWorkflows',
  description: 'Create new workflows in HaloPSA',
  parameters: {
    type: 'object',
    properties: {
      workflows: {
        type: 'array',
        description: 'The workflows to create - array of workflow objects'
      }
    },
    required: ['workflows']
  },
  execute: async (params, { log }) => {
    try {
      log.info(`Creating ${params.workflows.length} workflows`);
      const result = await createWorkflows(params.workflows);
      log.info(`Successfully created ${result.length} workflows`);
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      };
    } catch (error) {
      // Log error with detailed diagnostic information
      log.error(`Failed to create workflows`, {
        operationId,
        error: error.message,
        stack: error.stack,
        count: params.workflows.length,
        sessionId: session?.server?.sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Send error progress
      reportProgress({
        progress: 100,
        total: 100,
        status: 'Creation failed'
      });
      
      return {
        type: 'text',
        text: JSON.stringify({ 
          error: error.message,
          timestamp: new Date().toISOString() 
        }, null, 2)
      };
    }
  }
});

// Set up graceful shutdown with enhanced logging
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception occurred`, {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime()
    }
  });
  handleShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled promise rejection`, {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : 'No stack trace available',
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime()
    }
  });
  // Don't exit for unhandled rejections, just log them
});

/**
 * Graceful shutdown handler with reason tracking
 * @param {string} reason - The reason for shutdown
 */
async function handleShutdown(reason = 'manual') {
  const shutdownStart = Date.now();
  
  logger.info(`Shutting down MCP server gracefully`, {
    reason,
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime()
    }
  });
  
  try {
    // Close all active sessions with notification
    const activeSessions = mcp.sessions || [];
    if (activeSessions.length > 0) {
      logger.info(`Closing ${activeSessions.length} active client sessions`, {
        sessionIds: activeSessions.map(s => s.server.sessionId)
      });
      
      // Notify each session about shutdown
      for (const session of activeSessions) {
        try {
          const sessionLogger = createLogger(session);
          sessionLogger.warn(`Server is shutting down`, {
            reason,
            timestamp: new Date().toISOString()
          });
          
          // Give each session time to process the shutdown notification
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          logger.debug(`Failed to send shutdown notification to session`, {
            sessionId: session.server.sessionId,
            error: error.message
          });
        }
      }
    }
    
    // Stop the MCP server with timeout
    const stopPromise = mcp.stop();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Server stop timeout')), 5000)
    );
    
    await Promise.race([stopPromise, timeoutPromise]);
    
    const shutdownDuration = Date.now() - shutdownStart;
    logger.info(`MCP server stopped successfully`, {
      duration: `${shutdownDuration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error stopping MCP server`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  // Give pending operations time to complete
  setTimeout(() => {
    logger.info(`Process exit`, {
      reason,
      timestamp: new Date().toISOString()
    });
    process.exit(0);
  }, 2000); // Increased to 2000ms to allow more time for cleanup
}

/**
 * Verify API connectivity with enhanced logging
 * @returns {Promise<boolean>} True if connection succeeds
 */
async function verifyApiConnectivity() {
  const startTime = Date.now();
  
  try {
    logger.info(`Verifying HaloPSA API connectivity`, {
      timestamp: new Date().toISOString(),
      baseUrl: process.env.HALOPSA_BASE_URL,
      tenant: process.env.HALOPSA_TENANT
    });
    
    const token = await getAuthToken();
    const duration = Date.now() - startTime;
    
    logger.info(`Successfully authenticated with HaloPSA API`, {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      tokenExpiry: tokenCache?.expiresAt ? new Date(tokenCache.expiresAt).toISOString() : 'unknown'
    });
    
    // Log auth token info at debug level (without exposing the token)
    logger.debug(`Authentication details`, {
      tokenType: 'Bearer',
      tokenExists: !!token,
      tokenLength: token ? token.length : 0,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`HaloPSA API connectivity test failed`, {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      request: {
        baseUrl: process.env.HALOPSA_BASE_URL,
        tenant: process.env.HALOPSA_TENANT
      }
    });
    
    // Add detailed error response logging
    if (error.response) {
      logger.error(`API error response details`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: Object.keys(error.response.headers || {}), // Just log header names, not values
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      logger.error(`API request failed - no response`, {
        request: {
          method: error.request.method,
          path: error.request.path,
          host: error.request.host
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return false;
  }
}

// Start the server with explicit configuration and enhanced logging
(async function startServer() {
  const startTime = Date.now();
  
  logger.info(`Starting HaloPSA Workflows MCP Server`, {
    version: '0.3.1',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
  
  try {
    // Log system information
    logger.debug(`System information`, {
      memory: {
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      },
      cpu: {
        count: require('os').cpus().length
      },
      transport: 'stdio',
      timestamp: new Date().toISOString()
    });
    
    // Verify API connectivity first
    const apiConnected = await verifyApiConnectivity();
    if (!apiConnected) {
      logger.error(`Cannot start MCP server due to HaloPSA API connectivity issues`, {
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    }
    
    // Start the MCP server with enhanced configuration
    logger.info(`Initializing MCP server`, {
      transportType: 'stdio',
      timestamp: new Date().toISOString()
    });
    
    // Configure transport options with enhanced stability
    const transportOptions = {
      transportType: 'stdio',
      stdio: {
        rawMode: true,
        newlineMode: true,
        encoding: 'utf8',
        // Add additional stdio options for stability
        autoClose: false,  // Prevent automatic closing
        emitCloseEvent: false,  // Prevent close event emission
        readable: true,  // Ensure readable stream
        writable: true   // Ensure writable stream
      }
    };
    
    // Start server with retry logic and connection verification
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    let serverStarted = false;
    
    while (retryCount < maxRetries && !serverStarted) {
      try {
        // Start the server
        await mcp.start(transportOptions);
        
        // Wait for initial connection to be established
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);
          
          const checkConnection = () => {
            if (mcp.sessions && mcp.sessions.length > 0) {
              clearTimeout(timeout);
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          
          checkConnection();
        });
        
        serverStarted = true;
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        logger.warn(`Server start attempt ${retryCount} failed, retrying in ${retryDelay}ms`, {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    if (!serverStarted) {
      throw new Error('Failed to establish initial connection after multiple attempts');
    }
    
    const startupDuration = Date.now() - startTime;
    logger.info(`HaloPSA Workflows MCP Server started successfully`, {
      duration: `${startupDuration}ms`,
      timestamp: new Date().toISOString(),
      ready: true,
      sessions: mcp.sessions?.length || 0
    });
    
    // Set up process signal handlers
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error(`Failed to start MCP server`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
})();
