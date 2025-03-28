/**
 * MCP Protocol Compatibility Layer
 * 
 * Ensures compatibility between different versions of MCP protocol implementations:
 * - FastMCP (1.20.5+)
 * - Azure MCP
 * - Lucidity MCP
 * - Browser-use MCP Server
 * 
 * Version: 1.1.0 - Enhanced for improved compatibility
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';

// Protocol versions supported
export const PROTOCOL_VERSIONS = {
  DEFAULT: '1.0',
  FASTMCP: '1.20.5',
  LATEST: '2024-11-05'
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
    version: serverConfig.version
    // Removed authenticate callback to avoid compatibility issues
  });

  // Add enhanced protocol capabilities
  enhanceProtocolCapabilities(mcp, config);
  
  // Add enhanced error handling
  enhanceErrorHandling(mcp);

  return mcp;
}

/**
 * Enhance MCP server with protocol capabilities and improved negotiation
 * This version is more defensive against undefined properties
 * @param {FastMCP} mcp - FastMCP server instance
 * @param {Object} config - Server configuration
 */
function enhanceProtocolCapabilities(mcp, config) {
  try {
    // Make defensive copies of original methods to avoid undefined errors
    const originalStart = typeof mcp.start === 'function' ? mcp.start : null;
    const originalHandleInitialize = mcp._handleInitialize ? mcp._handleInitialize : null;
    
    // Only patch _handleInitialize if it exists
    if (originalHandleInitialize) {
      try {
        mcp._handleInitialize = async function(request, session) {
          try {
            // Create a safe copy of the request to avoid mutating the original
            const safeRequest = { 
              ...request,
              params: { ...request.params } 
            };
            
            // Log initialization request for debugging
            console.debug(`Initialize request: ${JSON.stringify(safeRequest.params)}`);
            
            // Fix missing protocol requirements
            if (!safeRequest.params.protocolVersion) {
              console.warn('Client did not provide protocolVersion, adding default');
              safeRequest.params.protocolVersion = PROTOCOL_VERSIONS.DEFAULT;
            }
            
            if (!safeRequest.params.capabilities) {
              console.warn('Client did not provide capabilities, adding defaults');
              safeRequest.params.capabilities = {
                models: config.models || [],
                tools: {}
              };
            }
            
            // Handle initialization with fixed request
            return await originalHandleInitialize.call(this, safeRequest, session);
          } catch (error) {
            console.error(`Protocol negotiation error: ${error.message}`);
            
            // Handle known protocol errors
            if (error.message && error.message.includes('Required')) {
              console.warn('Falling back to minimal protocol initialization');
              
              // Create minimal valid request
              const minimalRequest = {
                ...request,
                params: {
                  clientInfo: request.params?.clientInfo || { name: 'UnknownClient', version: '1.0.0' },
                  protocolVersion: PROTOCOL_VERSIONS.DEFAULT,
                  capabilities: { models: [], tools: {} }
                }
              };
              
              try {
                return await originalHandleInitialize.call(this, minimalRequest, session);
              } catch (fallbackError) {
                console.error(`Fallback initialization failed: ${fallbackError.message}`);
                
                // If even the fallback fails, simulate a successful init response
                return {
                  protocolVersion: PROTOCOL_VERSIONS.LATEST,
                  capabilities: {
                    tools: {},
                    logging: {}
                  },
                  serverInfo: {
                    name: config.name || 'MCP Server',
                    version: config.version || '1.0.0'
                  }
                };
              }
            }
            
            throw error;
          }
        };
      } catch (error) {
        console.error(`Failed to patch initialize handler: ${error.message}`);
      }
    }
    
    // Only patch start if it exists
    if (originalStart) {
      try {
        // Override start method to handle transport options
        mcp.start = async function(options = { transportType: 'stdio' }) {
          try {
            // Add custom capabilities based on transport type
            if (options.transportType === 'sse') {
              // Configure for browser-based clients
              options.sse = options.sse || { 
                endpoint: '/v1/mcp', 
                port: process.env.MCP_PORT || 3000 
              };
            }
            
            // Add robust error recovery
            const transportResilience = {
              maxReconnectAttempts: 3,
              reconnectDelay: 1000,
              defaultTimeout: 30000
            };
            
            // Start the server with enhanced options
            const enhancedOptions = {
              ...options,
              resilience: transportResilience
            };
            
            // Register tools with improved handler - wrapped in try/catch
            try {
              if (typeof patchToolsRegistration === 'function') {
                patchToolsRegistration(mcp);
              }
            } catch (error) {
              console.error(`Failed to patch tool registration: ${error.message}`);
            }
            
            console.info(`Starting MCP server with transport: ${options.transportType}`);
            return await originalStart.call(this, enhancedOptions);
          } catch (error) {
            console.error(`MCP server start error: ${error.message}`);
            
            // Attempt fallback to basic configuration
            if (error.message.includes('transport') || error.message.includes('connection')) {
              console.warn('Falling back to stdio transport');
              try {
                return await originalStart.call(this, { transportType: 'stdio' });
              } catch (fallbackError) {
                console.error(`Fallback to stdio transport failed: ${fallbackError.message}`);
                // Last resort - try without any options
                return await originalStart.call(this);
              }
            }
            
            throw error;
          }
        };
      } catch (error) {
        console.error(`Failed to patch start method: ${error.message}`);
      }
    }
    
    // Try to patch tools/list but don't let it break everything
    try {
      if (typeof patchToolsListMethod === 'function') {
        patchToolsListMethod(mcp);
      }
    } catch (error) {
      console.error(`Failed to patch tools/list method: ${error.message}`);
    }
    
    // Add direct handling for tools/list at the server level
    try {
      // Define a handler function that can be called directly
      mcp.handleToolsList = async function(request, session) {
        try {
          // Simple implementation that doesn't rely on internal properties
          const tools = [];
          
          // Try to access tools from the mcp instance if they exist
          if (Array.isArray(mcp._tools)) {
            mcp._tools.forEach(tool => {
              tools.push({
                name: tool.name,
                description: tool.description || '',
                parameters: tool.parameters || { type: 'object', properties: {} }
              });
            });
          }
          
          return { tools };
        } catch (error) {
          console.error(`Error in handleToolsList: ${error.message}`);
          return { tools: [] };
        }
      };
    } catch (error) {
      console.error(`Failed to add tools/list handler: ${error.message}`);
    }
  } catch (error) {
    console.error(`Failed to enhance protocol capabilities: ${error.message}`);
  }
}

/**
 * Patch the tools/list method to fix typeName errors
 * @param {FastMCP} mcp - FastMCP server instance
 */
function patchToolsListMethod(mcp) {
  try {
    // Check if methodHandlers exists
    if (!mcp._methodHandlers) {
      console.warn('MCP instance does not have _methodHandlers property, skipping patch');
      return;
    }
    
    // Store the original method handlers
    const originalMethodHandlers = { ...mcp._methodHandlers };
    
    // Add a specific handler for tools/list if it doesn't exist
    if (!mcp._methodHandlers['tools/list'] || 
        (mcp._methodHandlers['tools/list'].toString && 
         mcp._methodHandlers['tools/list'].toString().includes('typeName'))) {
      
      mcp._methodHandlers['tools/list'] = async function(request, session) {
        try {
          // If original handler exists, try it first
          if (originalMethodHandlers['tools/list']) {
            return await originalMethodHandlers['tools/list'].call(this, request, session);
          }
          
          // Fallback implementation
          const tools = mcp._tools?.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            parameters: tool.parameters || { type: 'object', properties: {} }
          })) || [];
          
          return {
            tools
          };
        } catch (error) {
          console.error(`Error in tools/list: ${error.message}`);
          
          // Return minimal valid response
          return {
            tools: mcp._tools?.map(tool => ({
              name: tool.name,
              description: tool.description || ''
            })) || []
          };
        }
      };
    }
  } catch (error) {
    // Log error but don't break execution
    console.error(`Failed to patch tools/list method: ${error.message}`);
  }
}

/**
 * Patch tool registration to fix parameter validation issues
 * @param {FastMCP} mcp - FastMCP server instance 
 */
function patchToolsRegistration(mcp) {
  try {
    // Check if addTool exists
    if (typeof mcp.addTool !== 'function') {
      console.warn('MCP instance does not have addTool method, skipping patch');
      return;
    }
    
    // Store the original addTool method
    const originalAddTool = mcp.addTool;
    
    // Override addTool to fix parameter validation
    mcp.addTool = function(tool) {
      if (!tool) {
        console.warn('Attempted to add undefined or null tool');
        return originalAddTool.call(this, tool);
      }
      
      try {
        // Ensure tool has a valid parameters property with safeParse
        if (tool.parameters) {
          if (typeof tool.parameters === 'object' && !tool.parameters.safeParse) {
            // Add safeParse method if not present
            tool.parameters.safeParse = (data) => {
              try {
                // For Zod parameters, call parse if available
                if (typeof tool.parameters.parse === 'function') {
                  const result = tool.parameters.parse(data);
                  return { success: true, data: result };
                }
                return { success: true, data };
              } catch (error) {
                return { success: false, error };
              }
            };
          }
        } else {
          // Add default parameters if missing
          tool.parameters = {
            safeParse: (data) => ({ success: true, data }),
            parse: (data) => data
          };
        }
        
        // Only wrap execute if it exists
        if (typeof tool.execute === 'function') {
          // Wrap the execute function to handle errors
          const originalExecute = tool.execute;
          tool.execute = async function(args, context) {
            try {
              // Create a fallback context if none provided
              const safeContext = context || {
                log: {
                  info: console.info,
                  error: console.error,
                  debug: console.debug,
                  warn: console.warn
                }
              };
              
              return await originalExecute.call(this, args, safeContext);
            } catch (error) {
              console.error(`Error executing tool ${tool.name}: ${error.message}`);
              return {
                type: 'text',
                text: JSON.stringify({
                  error: error.message,
                  details: process.env.NODE_ENV === 'development' ? error.stack : null
                })
              };
            }
          };
        }
        
        // Register the enhanced tool
        return originalAddTool.call(this, tool);
      } catch (error) {
        // Log error but still register the original tool
        console.error(`Error enhancing tool ${tool?.name}: ${error.message}`);
        return originalAddTool.call(this, tool);
      }
    };
  } catch (error) {
    // Log error but don't break execution
    console.error(`Failed to patch tool registration: ${error.message}`);
  }
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
      const enhancedHandler = (event) => {
        try {
          // Fix session handling for compatibility
          handler(event);
          
          // Send welcome message for debugging
          if (event.session && event.session.requestSampling) {
            try {
              event.session.requestSampling({
                role: 'tool',
                content: [{ 
                  type: 'text', 
                  text: 'Connected to HaloPSA Workflows MCP Server' 
                }]
              }).catch(() => {
                // Ignore errors from welcome message
              });
            } catch (error) {
              // Ignore errors from welcome message
            }
          }
        } catch (error) {
          console.error(`Session connection error: ${error.message}`);
          handler(event); // Fall back to original session
        }
      };
      return originalOnError.call(this, event, enhancedHandler);
    }
    
    return originalOnError.call(this, event, handler);
  };
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
 * This enhanced version ensures compatibility with both schema validation methods
 * @param {Object} schema - JSON Schema for tool parameters
 * @returns {Object} Standardized tool parameters as Zod schema with safeParse method
 */
export function createToolParameters(schema) {
  try {
    // If schema is already a Zod schema, ensure it has safeParse
    if (schema instanceof z.ZodType) {
      // Add compatibility layer if needed
      if (!schema.safeParse) {
        console.warn('Adding safeParse compatibility wrapper to existing Zod schema');
        return enhanceZodSchema(schema);
      }
      return schema;
    }
    
    // Convert JSON schema to Zod schema for FastMCP
    const zodSchema = convertToZodSchema(schema);
    
    // Add compatibility wrapper for schema validation
    return enhanceZodSchema(zodSchema);
  } catch (error) {
    console.error(`Error creating tool parameters: ${error.message}`);
    // Create a passthrough schema that accepts any input
    return createPassthroughSchema(schema);
  }
}

/**
 * Enhance a Zod schema with compatibility methods
 * @param {z.ZodType} schema - Zod schema to enhance
 * @returns {z.ZodType} Enhanced schema with additional methods
 */
function enhanceZodSchema(schema) {
  // Only add these if they don't already exist
  if (!schema.safeParse) {
    schema.safeParse = (data) => {
      try {
        const result = schema.parse(data);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error };
      }
    };
  }
  
  return schema;
}

/**
 * Create a passthrough schema that accepts any input
 * Used as a fallback when schema creation fails
 * @param {Object} originalSchema - Original schema definition
 * @returns {Object} Compatible schema object with safeParse method
 */
function createPassthroughSchema(originalSchema) {
  const schema = z.any();
  schema.safeParse = (data) => ({ success: true, data });
  schema._original = originalSchema;
  return schema;
}

/**
 * Convert JSON schema to Zod schema with improved handling
 * for nested objects and complex validation
 * @param {Object} jsonSchema - JSON Schema object
 * @returns {z.ZodType} Zod schema
 */
function convertToZodSchema(jsonSchema) {
  if (!jsonSchema) return z.any();
  
  // Handle schemas with multiple types
  if (Array.isArray(jsonSchema.type)) {
    // Create a union of the possible types
    const schemas = jsonSchema.type.map(type => 
      convertToZodSchema({ ...jsonSchema, type })
    );
    return z.union(schemas);
  }
  
  // Handle schema references ($ref)
  if (jsonSchema.$ref) {
    // For now, treat references as any type
    // In a more complete implementation, this would resolve the reference
    console.warn(`Schema reference found but not resolved: ${jsonSchema.$ref}`);
    return z.any();
  }
  
  switch (jsonSchema.type) {
    case 'object':
      const shape = {};
      
      // Process properties
      if (jsonSchema.properties) {
        for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
          try {
            let prop = convertToZodSchema(propSchema);
            
            // Check if property is required
            if (jsonSchema.required && jsonSchema.required.includes(key)) {
              shape[key] = prop;
            } else {
              shape[key] = prop.optional();
            }
          } catch (error) {
            console.warn(`Error converting property ${key}: ${error.message}`);
            // Fallback to any type for this property
            shape[key] = z.any().optional();
          }
        }
      }
      
      // Handle additional properties
      let schema = z.object(shape);
      if (jsonSchema.additionalProperties === true) {
        // Allow any additional properties
        schema = schema.passthrough();
      }
      
      return schema;
      
    case 'array':
      let arraySchema;
      try {
        arraySchema = z.array(jsonSchema.items ? convertToZodSchema(jsonSchema.items) : z.any());
        
        // Handle min/max items
        if (jsonSchema.minItems !== undefined) {
          arraySchema = arraySchema.min(jsonSchema.minItems);
        }
        if (jsonSchema.maxItems !== undefined) {
          arraySchema = arraySchema.max(jsonSchema.maxItems);
        }
      } catch (error) {
        console.warn(`Error converting array schema: ${error.message}`);
        arraySchema = z.array(z.any());
      }
      return arraySchema;
      
    case 'string':
      let stringSchema = z.string();
      try {
        // Apply string validations
        if (jsonSchema.minLength !== undefined) {
          stringSchema = stringSchema.min(jsonSchema.minLength);
        }
        if (jsonSchema.maxLength !== undefined) {
          stringSchema = stringSchema.max(jsonSchema.maxLength);
        }
        if (jsonSchema.pattern) {
          stringSchema = stringSchema.regex(new RegExp(jsonSchema.pattern));
        }
        
        // Apply string formats
        if (jsonSchema.format) {
          switch (jsonSchema.format) {
            case 'email':
              stringSchema = z.string().email();
              break;
            case 'uri':
            case 'url':
              stringSchema = z.string().url();
              break;
            case 'date-time':
            case 'date':
              stringSchema = z.string().datetime();
              break;
          }
        }
      } catch (error) {
        console.warn(`Error applying string validations: ${error.message}`);
        stringSchema = z.string();
      }
      return stringSchema;
      
    case 'number':
    case 'integer':
      let numberSchema = jsonSchema.type === 'integer' ? z.number().int() : z.number();
      try {
        // Apply number validations
        if (jsonSchema.minimum !== undefined) {
          numberSchema = numberSchema.min(jsonSchema.minimum);
        }
        if (jsonSchema.maximum !== undefined) {
          numberSchema = numberSchema.max(jsonSchema.maximum);
        }
        if (jsonSchema.exclusiveMinimum !== undefined) {
          numberSchema = numberSchema.gt(jsonSchema.exclusiveMinimum);
        }
        if (jsonSchema.exclusiveMaximum !== undefined) {
          numberSchema = numberSchema.lt(jsonSchema.exclusiveMaximum);
        }
        if (jsonSchema.multipleOf !== undefined) {
          // Custom validation for multipleOf
          numberSchema = numberSchema.refine(
            val => val % jsonSchema.multipleOf === 0,
            { message: `Number must be a multiple of ${jsonSchema.multipleOf}` }
          );
        }
      } catch (error) {
        console.warn(`Error applying number validations: ${error.message}`);
        numberSchema = jsonSchema.type === 'integer' ? z.number().int() : z.number();
      }
      return numberSchema;
      
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
 * Normalize result for compatibility across different MCP implementations
 * @param {any} result - Result from handler
 * @returns {Object} Normalized result
 */
function normalizeResult(result) {
  try {
    // Handle null or undefined
    if (result === null || result === undefined) {
      return {
        type: 'text',
        text: 'Operation completed successfully with no result'
      };
    }
    
    // Handle string results
    if (typeof result === 'string') {
      return {
        type: 'text',
        text: result
      };
    }
    
    // Handle error results
    if (result instanceof Error) {
      return {
        type: 'text',
        text: JSON.stringify({
          error: result.message,
          details: process.env.NODE_ENV === 'development' ? result.stack : null
        }, null, 2)
      };
    }
    
    // Handle content objects - format directly supported by MCP
    if (typeof result === 'object' && 
        result !== null && 
        result.type && 
        (result.type === 'text' || result.type === 'image')) {
      return result;
    }
    
    // Handle content arrays - standard MCP format
    if (typeof result === 'object' && 
        result !== null && 
        result.content && 
        Array.isArray(result.content)) {
      // Validate each content item has correct structure
      const validContent = result.content.every(item => 
        item && typeof item === 'object' && item.type && 
        (item.type === 'text' || item.type === 'image')
      );
      
      if (validContent) {
        return result;
      } else {
        // Convert invalid content to valid format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.content, null, 2)
            }
          ]
        };
      }
    }
    
    // Handle plain objects that are not content objects
    if (typeof result === 'object' && result !== null) {
      // Check if this might be an Azure MCP format result
      if (result.value !== undefined) {
        return {
          type: 'text',
          text: typeof result.value === 'string' ? result.value : JSON.stringify(result.value, null, 2)
        };
      }
      
      // Standard object conversion
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      };
    }
    
    // Handle primitive values
    return {
      type: 'text',
      text: String(result)
    };
  } catch (error) {
    console.error(`Error normalizing result: ${error.message}`);
    // Provide a safe fallback
    return {
      type: 'text',
      text: 'Error occurred while processing the result'
    };
  }
}
