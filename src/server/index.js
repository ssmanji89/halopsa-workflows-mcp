/**
 * HaloPSA Workflows MCP Server
 * Main server implementation using FastMCP
 */
import { FastMCP } from 'fastmcp';
import config from '../config/index.js';
import tools from '../tools/index.js';
import apiClient from '../api/client.js';

// Create logger
const isDebug = config.isDebug();
const logger = {
  debug: (message) => {
    if (isDebug) console.error(`[DEBUG] ${message}`);
  },
  info: (message) => console.error(`[INFO] ${message}`),
  warn: (message) => console.error(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

class MCPServer {
  constructor() {
    // Create FastMCP instance with enhanced configuration
    this.mcp = new FastMCP({
      name: config.server.name,
      description: config.server.description,
      models: config.server.models,
      // Enhanced connection settings
      connectionTimeout: 120000, // 2 minutes
      reconnectDelay: 5000,     // 5 seconds
      transportType: 'stdio',   // Force stdio transport
      // Enhanced capabilities configuration
      capabilities: {
        tools: tools.reduce((acc, tool) => {
          acc[tool.name] = {
            description: tool.description,
            parameters: tool.parameters
          };
          return acc;
        }, {}),
        models: config.server.models
      }
    });
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Setup shutdown handlers
    this.setupShutdownHandlers();
    
    // Keep process alive
    process.stdin.resume();
  }
  
  /**
   * Setup MCP event handlers
   */
  setupEventHandlers() {
    this.mcp.on('connect', async ({ session }) => {
      logger.info(`New client connected`, {
        sessionId: session.server.sessionId,
        capabilities: this.mcp.capabilities
      });
      
      // Register tools after connection is established
      await this.registerTools(session);
      
      // Handle session-specific events
      session.on('error', (error) => {
        logger.warn(`Session error: ${error.error?.message || 'Unknown error'}`);
      });
      
      // Send welcome message using proper method
      try {
        session.requestSampling({
          role: 'tool',
          content: [{ 
            type: 'text', 
            text: 'Connected to HaloPSA Workflows MCP Server' 
          }]
        }).catch((error) => {
          logger.debug(`Failed to send welcome message: ${error.message}`);
        });
      } catch (error) {
        logger.debug(`Failed to create welcome message: ${error.message}`);
      }
    });
    
    this.mcp.on('disconnect', ({ session }) => {
      logger.info(`Client disconnected, session ID: ${session.server.sessionId}`);
    });
    
    this.mcp.on('error', (error) => {
      logger.error(`Server error: ${error.message || 'Unknown error'}`);
    });
  }
  
  /**
   * Register all tools with the MCP server
   */
  async registerTools(session) {
    // Register each tool with enhanced configuration
    for (const tool of tools) {
      try {
        await session.addTool({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          handler: async (params) => {
            try {
              const result = await tool.handler(params);
              return result; // Return raw result without wrapping
            } catch (error) {
              logger.error(`Tool execution failed: ${error.message}`);
              return { error: error.message };
            }
          }
        });
      } catch (error) {
        logger.error(`Failed to register tool ${tool.name}: ${error.message}`);
      }
    }
    
    logger.info(`Registered ${tools.length} tools with MCP server`, {
      tools: tools.map(t => t.name)
    });
  }
  
  /**
   * Setup process shutdown handlers
   */
  setupShutdownHandlers() {
    // Set up graceful shutdown
    process.on('SIGINT', () => this.handleShutdown());
    process.on('SIGTERM', () => this.handleShutdown());
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      logger.error(error.stack);
      this.handleShutdown();
    });
  }
  
  /**
   * Handle graceful shutdown
   */
  async handleShutdown() {
    logger.info('Shutting down MCP server gracefully...');
    try {
      // Close all active sessions first
      const activeSessions = this.mcp.sessions || [];
      if (activeSessions.length > 0) {
        logger.info(`Closing ${activeSessions.length} active sessions`);
        for (const session of activeSessions) {
          try {
            await session.close();
          } catch (error) {
            logger.warn(`Error closing session: ${error.message}`);
          }
        }
      }

      // Give sessions time to close
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stop the MCP server
      await this.mcp.stop();
      logger.info('MCP server stopped successfully');
    } catch (error) {
      logger.error(`Error stopping MCP server: ${error.message}`);
    }
    
    // Give pending operations time to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    process.exit(0);
  }
  
  /**
   * Verify HaloPSA API connectivity
   */
  async verifyApiConnectivity() {
    try {
      logger.info('Verifying HaloPSA API connectivity...');
      await apiClient.getAuthToken();
      logger.info('Successfully authenticated with HaloPSA API');
      return true;
    } catch (error) {
      logger.error(`HaloPSA API connectivity test failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Start the MCP server
   */
  async start() {
    logger.info('Starting HaloPSA Workflows MCP Server...');
    
    try {
      // Verify API connectivity first
      const apiConnected = await this.verifyApiConnectivity();
      if (!apiConnected) {
        logger.error('Cannot start MCP server due to HaloPSA API connectivity issues');
        process.exit(1);
      }
      
      // Start the MCP server with basic configuration
      await this.mcp.start({
        transportType: 'stdio'
      });
      
      logger.info('HaloPSA Workflows MCP Server started successfully');
    } catch (error) {
      logger.error(`Failed to start MCP server: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
      process.exit(1);
    }
  }
}

// Create server instance
const server = new MCPServer();

export default server;
