/**
 * API client for HaloPSA Workflow endpoints
 * Implements methods for interacting with workflows and workflow steps
 */
import { AxiosError } from 'axios';
import { createAuthenticatedClient } from './auth.js';
import {
  FlowDetail,
  FlowHeader,
  WorkflowTarget,
  WorkflowTargetStep,
  WorkflowHistory,
  ApiErrorResponse
} from './types.js';

// Global error counting for throttling
declare global {
  var errorCounts: {[key: string]: number} | undefined;
}

// Initialize global
global.errorCounts = global.errorCounts || {};

/**
 * Log level management based on environment variable
 */
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Enhanced logging with level control - all redirected to stderr
 */
const logger = {
  error: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.warn) {
      console.error(`[WARN] ${message}`, ...args); // Redirected to stderr
    }
  },
  info: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.info) {
      console.error(`[INFO] ${message}`, ...args); // Redirected to stderr
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.debug) {
      console.error(`[DEBUG] ${message}`, ...args); // Redirected to stderr
    }
  }
};

/**
 * Get workflow steps from HaloPSA API
 * @param includecriteriainfo Whether to include criteria information
 * @returns Promise resolving to an array of workflow steps
 */
export async function getWorkflowSteps(includecriteriainfo?: boolean): Promise<FlowDetail[]> {
  try {
    const client = await createAuthenticatedClient();
    const params: Record<string, any> = {};
    
    if (includecriteriainfo !== undefined) {
      params.includecriteriainfo = includecriteriainfo;
    }
    
    logger.debug(`Requesting workflow steps with params: ${JSON.stringify(params)}`);
    const response = await client.get('/workflowstep', { params });
    
    logger.info(`Retrieved ${response.data.length} workflow steps`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get workflow steps');
  }
}

/**
 * Get workflow headers from HaloPSA API
 * @param params Query parameters for filtering workflows
 * @returns Promise resolving to an array of workflow headers
 */
export async function getWorkflows(params?: {
  access_control_level?: number;
  includeinactive?: boolean;
}): Promise<FlowHeader[]> {
  try {
    const client = await createAuthenticatedClient();
    
    logger.debug(`Requesting workflows with params: ${JSON.stringify(params || {})}`);
    const response = await client.get('/Workflow', { params });
    
    logger.info(`Retrieved ${response.data.length} workflows`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to get workflows');
  }
}

/**
 * Create workflow headers in HaloPSA API
 * @param workflows Array of workflow headers to create
 * @returns Promise resolving to the created workflow headers
 */
export async function createWorkflows(workflows: FlowHeader[]): Promise<FlowHeader[]> {
  try {
    const client = await createAuthenticatedClient();
    
    logger.debug(`Creating ${workflows.length} workflows`);
    const response = await client.post('/Workflow', workflows);
    
    logger.info(`Created ${response.data.length} workflows`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create workflows');
  }
}

/**
 * Get a single workflow header by ID from HaloPSA API
 * @param id Workflow ID
 * @param includedetails Whether to include workflow details
 * @returns Promise resolving to a workflow header
 */
export async function getWorkflow(id: number, includedetails?: boolean): Promise<FlowHeader> {
  try {
    const client = await createAuthenticatedClient();
    const params: Record<string, any> = {};
    
    if (includedetails !== undefined) {
      params.includedetails = includedetails;
    }
    
    logger.debug(`Requesting workflow ${id} with params: ${JSON.stringify(params)}`);
    const response = await client.get(`/Workflow/${id}`, { params });
    
    logger.info(`Retrieved workflow ${id}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, `Failed to get workflow ${id}`);
  }
}

/**
 * Delete a workflow header by ID from HaloPSA API
 * @param id Workflow ID to delete
 * @returns Promise resolving when the deletion is complete
 */
export async function deleteWorkflow(id: number): Promise<void> {
  try {
    const client = await createAuthenticatedClient();
    
    logger.debug(`Deleting workflow ${id}`);
    await client.delete(`/Workflow/${id}`);
    
    logger.info(`Deleted workflow ${id}`);
  } catch (error) {
    return handleApiError(error, `Failed to delete workflow ${id}`);
  }
}

/**
 * Enhanced error handling for API errors with connection state awareness
 * @param error The error that occurred
 * @param defaultMessage Default message if error details cannot be extracted
 * @throws Error with detailed message and context
 */
function handleApiError(error: any, defaultMessage: string): never {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  let errorMessage = '';
  let errorContext = {};
  
  // Add request ID to improve traceability
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  
  // Track error counts for throttling
  const errorKey = `${defaultMessage}_${Date.now().toString().substring(0, 10)}`;
  global.errorCounts = global.errorCounts || {};
  global.errorCounts[errorKey] = (global.errorCounts[errorKey] || 0) + 1;
  
  // Throttle excessive error logging
  const shouldLogDetail = global.errorCounts[errorKey] <= 5 || global.errorCounts[errorKey] % 10 === 0;
  
  if (axiosError.response) {
    // The request was made and the server responded with a status code outside 2xx
    const status = axiosError.response.status;
    const data = axiosError.response.data;
    
    errorMessage = data?.message || data?.error_description || `API Error (${status})`;
    errorContext = {
      requestId,
      status,
      endpoint: axiosError.config?.url || 'unknown',
      method: axiosError.config?.method?.toUpperCase() || 'unknown',
      data: shouldLogDetail ? JSON.stringify(data, null, 2) : '[truncated]',
      timestamp: new Date().toISOString()
    };
    
    if (shouldLogDetail) {
      logger.error(`[${requestId}] ${defaultMessage}: ${errorMessage}`, errorContext);
    } else {
      logger.warn(`API Error counter: ${global.errorCounts[errorKey]} occurrences of ${defaultMessage}`);
    }
    
    // Special handling for rate limiting
    if (status === 429) {
      // Get retry-after header if available
      const retryAfter = axiosError.response.headers['retry-after'] 
        ? parseInt(axiosError.response.headers['retry-after'], 10) 
        : 60;
      
      if (shouldLogDetail) {
        logger.warn(`[${requestId}] Rate limited by HaloPSA API. Retry after ${retryAfter} seconds.`);
      }
      
      // Add rate limit information to error
      const enhancedError = new Error(`HaloPSA API Rate Limited: ${errorMessage}`) as Error & { 
        status?: number; 
        context?: any;
        retryAfter?: number;
        isRateLimited?: boolean;
      };
      enhancedError.status = status;
      enhancedError.context = errorContext;
      enhancedError.retryAfter = retryAfter;
      enhancedError.isRateLimited = true;
      
      throw enhancedError;
    }
    
    // Enhanced error object with context
    const enhancedError = new Error(`HaloPSA API Error: ${errorMessage}`) as Error & { 
      status?: number; 
      context?: any;
    };
    enhancedError.status = status;
    enhancedError.context = errorContext;
    
    throw enhancedError;
  } else if (axiosError.request) {
    // The request was made but no response was received
    // This typically means a network issue or a timeout
    
    const isTimeout = axiosError.code === 'ECONNABORTED' || 
                     axiosError.message.includes('timeout');
    const isConnectionError = axiosError.code === 'ECONNREFUSED' || 
                             axiosError.code === 'ECONNRESET' ||
                             axiosError.code === 'ETIMEDOUT' ||
                             axiosError.code === 'EPIPE';
    
    errorMessage = isTimeout ? 'Request timed out' : 
                   isConnectionError ? `Connection error (${axiosError.code})` : 'No response received';
    
    errorContext = {
      requestId,
      endpoint: axiosError.config?.url || 'unknown',
      method: axiosError.config?.method?.toUpperCase() || 'unknown',
      timeout: axiosError.config?.timeout,
      timestamp: new Date().toISOString(),
      code: axiosError.code,
      errorCount: global.errorCounts[errorKey]
    };
    
    if (shouldLogDetail) {
      logger.error(`[${requestId}] ${defaultMessage}: ${errorMessage}`, errorContext);
    } else {
      logger.warn(`Network Error counter: ${global.errorCounts[errorKey]} occurrences of ${errorMessage} for ${defaultMessage}`);
    }
    
    // Enhanced error with context
    const enhancedError = new Error(`HaloPSA API Network Error: ${errorMessage}`) as Error & { 
      isNetworkError?: boolean; 
      isTimeout?: boolean;
      isConnectionError?: boolean;
      context?: any;
    };
    enhancedError.isNetworkError = true;
    enhancedError.isTimeout = isTimeout;
    enhancedError.isConnectionError = isConnectionError;
    enhancedError.context = errorContext;
    
    throw enhancedError;
  } else {
    // Something happened in setting up the request
    errorMessage = axiosError.message || 'Unknown error';
    errorContext = {
      requestId,
      timestamp: new Date().toISOString(),
      code: axiosError.code,
      errorCount: global.errorCounts[errorKey]
    };
    
    if (shouldLogDetail) {
      logger.error(`[${requestId}] ${defaultMessage}: ${errorMessage}`, errorContext);
    } else {
      logger.warn(`Generic Error counter: ${global.errorCounts[errorKey]} occurrences of ${errorMessage} for ${defaultMessage}`);
    }
    
    // Enhanced error with context
    const enhancedError = new Error(`HaloPSA API Error: ${errorMessage}`) as Error & { 
      context?: any;
    };
    enhancedError.context = errorContext;
    
    throw enhancedError;
  }
}