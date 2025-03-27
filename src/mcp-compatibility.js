/**
 * MCP Protocol Compatibility Layer
 * 
 * Ensures compatibility between different versions of MCP protocol implementations:
 * - FastMCP (1.20.5+)
 * - Azure MCP
 * - Lucidity MCP
 * - Browser-use MCP Server
 * 
 * Version: 1.0.0
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';

// Protocol versions supported
export const PROTOCOL_VERSIONS = {
  DEFAULT: '1.0',
  FASTMCP: '1.20.5',
  LATEST: '2024-03-27'
};

/**
 * Create an MCP server with enhanced compatibility features
 * that works across different MCP implementations
 * 
 * @param {Object} config - Server configuration
 * @param {string} config.name - Server name
 * @param {string} config.description - Server description
 * @param {string} config.version - Server version
 * @param {string[]} config.models - Supported models
 * @returns {FastMCP} Configured FastMCP instance
 */
export function createCompatibleMcpServer(config) {
  // Default configuration with safe fallbacks
  const serverConfig = {
    name: config.name || 'mcp-server',
    version: config.version || '1.0.0',
    description: config.description || 'MCP Server'
  };

  // Create server with standardized configuration
  const mcp = new FastMCP({
    name: serverConfig.name,
    version: serverConfig.version,
    authenticate: async (request) => {
      // Custom authentication that works with all client types
      try {
        // Extract auth info from headers if available
        const authHeader = request?.headers?.authorization;
        if (authHeader) {
          // Handle Bearer token authentication
          if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            return { token, authenticated: true };
          }
        }
        
        // Default authentication for clients without headers
        return { authenticated: true };
      } catch (error) {
        console.error(`Authentication error: ${error.message}`);
        return { authenticated: false, error: error.message };
      }
    }
  });

  // Add enhanced protocol capabilities
  enhanceProtocolCapabilities(mcp, config);
  
  // Add enhanced error handling
  enhanceErrorHandling(mcp);

  return mcp;
}

/**
 * Enhance MCP server with protocol capabilities
 * @param {FastMCP} mcp - FastMCP server instance
 * @param {Object} config - Server configuration
 */
function enhanceProtocolCapabilities(mcp, config) {
  // Store original protocol negotiation methods
  const originalStart = mcp.start;
  
  // Override start method to handle protocol negotiation
  mcp.start = async function(options = { transportType: 'stdio' }) {
    try {
      // Add custom capabilities based on client needs
      if (options.transportType === 'sse') {
        // Configure for browser-based clients
        options.sse = options.sse || { 
          endpoint: '/v1/mcp', 
          port: process.env.MCP_PORT || 3000 
        };
      }

      // Start the server with enhanced options
      return await originalStart.call(this, options);
    } catch (error) {
      console.error(`MCP server start error: ${error.message}`);
      
      // Attempt fallback to basic configuration
      if (error.message.includes('transport')) {
        console.warn('Falling back to stdio transport');
        return await originalStart.call(this, { transportType: 'stdio' });
      }
      
      throw error;
    }
  };
}

/**
 * Enhance MCP server with better error handling
 * @param {FastMCP} mcp - FastMCP server instance
 */
function enhanceErrorHandling(mcp) {
  const originalOnError = mcp.on;
  
  // Override 'on' method to add enhanced error handling
  mcp.on = function(event, handler) {
    if (event === 'error') {
      // Wrap the error handler to provide more detailed information
      const enhancedHandler = (error) => {
        const enhancedError = enhanceError(error);
        handler(enhancedError);
      };
      return originalOnError.call(this, event, enhancedHandler);
    }
    
    // Handle session events with special care
    if (event === 'connect') {
      const enhancedHandler = (session) => {
        try {
          // Normalize session object for compatibility
          const normalizedSession = normalizeSession(session);
          handler(normalizedSession);
        } catch (error) {
          console.error(`Session connection error: ${error.message}`);
          handler(session); // Fall back to original session
        }
      };
      return originalOnError.call(this, event, enhancedHandler);
    }
    
    return originalOnError.call(this, event, handler);
  };
}

/**
 * Normalize session object for compatibility
 * @param {Object} session - Session object
 * @returns {Object} Normalized session
 */
function normalizeSession(session) {
  // Ensure session has expected properties
  if (!session.session && session.server) {
    session.session = {
      server: session.server,
      clientCapabilities: session.clientCapabilities || null
    };
  }
  
  return session;
}

/**
 * Enhance error object with more details
 * @param {Error} error - Original error
 * @returns {Error} Enhanced error
 */
function enhanceError(error) {
  if (error.name === 'McpError') {
    // Already enhanced
    return error;
  }
  
  // Create a new error with enhanced fields
  const enhancedError = new Error(error.message);
  enhancedError.name = 'McpError';
  enhancedError.originalError = error;
  enhancedError.code = error.code || 'UNKNOWN_ERROR';
  enhancedError.data = error.data;
  enhancedError.stack = error.stack;
  
  return enhancedError;
}

/**
 * Creates standardized tool parameters using Zod schema for MCP
 * @param {Object} schema - JSON Schema for tool parameters
 * @returns {Object} Standardized tool parameters as Zod schema
 */
export function createToolParameters(schema) {
  try {
    // Convert JSON schema to Zod schema for FastMCP
    const zodSchema = convertToZodSchema(schema);
    return zodSchema;
  } catch (error) {
    console.error(`Error creating tool parameters: ${error.message}`);
    // Fallback to direct schema
    return schema;
  }
}

/**
 * Convert JSON schema to Zod schema
 * @param {Object} jsonSchema - JSON Schema object
 * @returns {z.ZodType} Zod schema
 */
function convertToZodSchema(jsonSchema) {
  if (!jsonSchema) return z.any();
  
  switch (jsonSchema.type) {
    case 'object':
      const shape = {};
      
      // Process properties
      if (jsonSchema.properties) {
        for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
          let prop = convertToZodSchema(propSchema);
          
          // Check if property is required
          if (jsonSchema.required && jsonSchema.required.includes(key)) {
            shape[key] = prop;
          } else {
            shape[key] = prop.optional();
          }
        }
      }
      
      return z.object(shape);
      
    case 'array':
      return z.array(jsonSchema.items ? convertToZodSchema(jsonSchema.items) : z.any());
      
    case 'string':
      let stringSchema = z.string();
      if (jsonSchema.format === 'email') stringSchema = z.string().email();
      if (jsonSchema.format === 'uri') stringSchema = z.string().url();
      return stringSchema;
      
    case 'number':
      return z.number();
      
    case 'integer':
      return z.number().int();
      
    case 'boolean':
      return z.boolean();
      
    case 'null':
      return z.null();
      
    default:
      return z.any();
  }
}

/**
 * Wraps tool execution with standardized error handling
 * @param {Function} handler - Tool handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function wrapToolHandler(handler) {
  return async (params, context) => {
    try {
      // Normalize context for compatibility
      const normalizedContext = normalizeContext(context);
      
      // Execute the original handler
      const result = await handler(params, normalizedContext);
      
      // Normalize the result
      return normalizeResult(result);
    } catch (error) {
      // Log the error
      if (context.log && context.log.error) {
        context.log.error(`Tool execution error: ${error.message}`);
      } else {
        console.error(`Tool execution error: ${error.message}`);
      }
      
      // Return standardized error response
      return {
        type: 'text',
        text: JSON.stringify({
          error: {
            message: error.message,
            code: error.code || 'EXECUTION_ERROR',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        })
      };
    }
  };
}

/**
 * Normalize context object for compatibility
 * @param {Object} context - Context object
 * @returns {Object} Normalized context
 */
function normalizeContext(context) {
  // Create a copy of the context to avoid mutation
  const normalizedContext = { ...context };
  
  // Ensure log methods exist
  if (!normalizedContext.log) {
    normalizedContext.log = {
      debug: (message) => console.debug(`[DEBUG] ${message}`),
      info: (message) => console.info(`[INFO] ${message}`),
      warn: (message) => console.warn(`[WARN] ${message}`),
      error: (message) => console.error(`[ERROR] ${message}`)
    };
  }
  
  // Ensure reportProgress exists
  if (!normalizedContext.reportProgress) {
    normalizedContext.reportProgress = async () => {};
  }
  
  return normalizedContext;
}

/**
 * Normalize result for compatibility
 * @param {any} result - Result from handler
 * @returns {Object} Normalized result
 */
function normalizeResult(result) {
  // Handle string results
  if (typeof result === 'string') {
    return {
      type: 'text',
      text: result
    };
  }
  
  // Handle plain objects that are not content objects
  if (typeof result === 'object' && 
      result !== null && 
      !result.type && 
      !result.content) {
    return {
      type: 'text',
      text: JSON.stringify(result, null, 2)
    };
  }
  
  // Handle content objects
  if (typeof result === 'object' && 
      result !== null && 
      result.type && 
      (result.type === 'text' || result.type === 'image')) {
    return result;
  }
  
  // Handle content arrays
  if (typeof result === 'object' && 
      result !== null && 
      result.content && 
      Array.isArray(result.content)) {
    return result;
  }
  
  // Default fallback
  return {
    type: 'text',
    text: typeof result === 'object' ? 
      JSON.stringify(result, null, 2) : 
      String(result)
  };
}
