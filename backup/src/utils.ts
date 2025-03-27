/**
 * Utility functions for the HaloPSA Workflow MCP Server
 * Provides common functionality for error handling, logging, and state management
 */

// Types for enhanced errors
export interface EnhancedError extends Error {
  code?: string;
  status?: number;
  context?: any;
  isRateLimited?: boolean;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  retryAfter?: number;
}

/**
 * Connection state manager
 * Tracks the connection state between the MCP server and clients
 */
export class ConnectionStateManager {
  private _isConnected: boolean = true;
  private _lastConnected: number = Date.now();
  private _disconnectCallbacks: Array<() => void> = [];
  private _reconnectCallbacks: Array<() => void> = [];

  /**
   * Get current connection state
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get timestamp of last successful connection
   */
  get lastConnected(): number {
    return this._lastConnected;
  }

  /**
   * Time since last connected in milliseconds
   */
  get timeSinceConnected(): number {
    return Date.now() - this._lastConnected;
  }

  /**
   * Set connection state
   * @param connected New connection state
   */
  setConnected(connected: boolean): void {
    // Only trigger events if state actually changes
    if (this._isConnected !== connected) {
      this._isConnected = connected;
      
      if (connected) {
        this._lastConnected = Date.now();
        this._reconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('[ERROR] Error in reconnect callback:', error);
          }
        });
      } else {
        this._disconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('[ERROR] Error in disconnect callback:', error);
          }
        });
      }
    }
  }

  /**
   * Register disconnect event handler
   * @param callback Function to call on disconnect
   */
  onDisconnect(callback: () => void): void {
    this._disconnectCallbacks.push(callback);
  }

  /**
   * Register reconnect event handler
   * @param callback Function to call on reconnect
   */
  onReconnect(callback: () => void): void {
    this._reconnectCallbacks.push(callback);
  }

  /**
   * Remove all event handlers
   */
  clearHandlers(): void {
    this._disconnectCallbacks = [];
    this._reconnectCallbacks = [];
  }
}

/**
 * Timer manager for tracking and cleaning up timers
 */
export class TimerManager {
  private _timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create and track a new timeout
   * @param callback Function to call when timer expires
   * @param ms Timeout in milliseconds
   * @param id Optional identifier for the timer
   * @returns Timer identifier
   */
  setTimeout(callback: () => void, ms: number, id?: string): string {
    const timerId = id || `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error(`[ERROR] Error in timer ${timerId} callback:`, error);
      } finally {
        this._timers.delete(timerId);
      }
    }, ms);
    
    this._timers.set(timerId, timer);
    return timerId;
  }

  /**
   * Create and track a new interval
   * @param callback Function to call on each interval
   * @param ms Interval in milliseconds
   * @param id Optional identifier for the interval
   * @returns Interval identifier
   */
  setInterval(callback: () => void, ms: number, id?: string): string {
    const timerId = id || `interval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`[ERROR] Error in interval ${timerId} callback:`, error);
      }
    }, ms);
    
    this._timers.set(timerId, timer);
    return timerId;
  }

  /**
   * Clear a specific timer or interval
   * @param id Timer identifier
   */
  clear(id: string): void {
    const timer = this._timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(id);
    }
  }

  /**
   * Clear all timers and intervals
   */
  clearAll(): void {
    this._timers.forEach((timer) => {
      clearTimeout(timer);
    });
    this._timers.clear();
  }

  /**
   * Get the number of active timers
   */
  get count(): number {
    return this._timers.size;
  }
}

/**
 * Create a timeout promise that rejects after the specified time
 * @param ms Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Race a promise against a timeout
 * @param promise Promise to race
 * @param ms Timeout in milliseconds
 * @returns Promise result or timeout error
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(ms)
  ]);
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise resolving to function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryableErrors?: Array<string | number>;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 1.5,
    retryableErrors = []
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry this error
      const shouldRetry = retryableErrors.length === 0 || 
        retryableErrors.includes(error.code) || 
        retryableErrors.includes(error.status);
      
      // Stop if we shouldn't retry or we're out of retries
      if (!shouldRetry || attempt >= maxRetries) {
        break;
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError || new Error('Operation failed');
}

/**
 * Setup graceful shutdown handlers
 * @param cleanupFn Function to call during shutdown
 */
export function setupGracefulShutdown(cleanupFn: () => Promise<void>): void {
  async function shutdown(signal: string): Promise<void> {
    console.error(`\n[INFO] Received ${signal}. Shutting down gracefully...`);
    
    try {
      await cleanupFn();
      console.error('[INFO] Cleanup complete, exiting...');
    } catch (error) {
      console.error('[ERROR] Error during shutdown cleanup:', error);
    }
    
    process.exit(0);
  }

  // Handle termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}
