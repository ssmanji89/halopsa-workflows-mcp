/**
 * Enhanced logging for HaloPSA Workflows MCP
 * This module provides a standardized logging solution that prevents
 * interference with the JSON-RPC communication protocol by redirecting
 * all log output to stderr or a log file.
 */

import fs from 'fs';
import path from 'path';

// Logging configuration
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const DEBUG = LOG_LEVEL === 'debug';
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_FILE = process.env.LOG_FILE || './halopsa-mcp-server.log';

// Create log directory if logging to file is enabled
if (LOG_TO_FILE) {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create log directory: ${error.message}`);
    }
  }
}

/**
 * Enhanced logger that always writes to stderr and optionally to a file
 * This prevents log messages from interfering with JSON-RPC communication
 */
export const logger = {
  _timestamp() {
    return new Date().toISOString();
  },

  _formatMessage(level, message) {
    return `[${this._timestamp()}] [${level.toUpperCase()}] ${message}`;
  },

  _logToFile(message) {
    if (LOG_TO_FILE) {
      try {
        fs.appendFileSync(LOG_FILE, message + '\n');
      } catch (error) {
        console.error(`[ERROR] Failed to write to log file: ${error.message}`);
      }
    }
  },

  debug(message) {
    if (DEBUG) {
      const formattedMessage = this._formatMessage('debug', message);
      console.error(formattedMessage);
      this._logToFile(formattedMessage);
    }
  },

  info(message) {
    const formattedMessage = this._formatMessage('info', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
  },

  warn(message) {
    const formattedMessage = this._formatMessage('warn', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
  },

  error(message, error) {
    const formattedMessage = this._formatMessage('error', message);
    console.error(formattedMessage);
    this._logToFile(formattedMessage);
    
    if (error && error.stack) {
      console.error(error.stack);
      this._logToFile(error.stack);
    }
  }
};

/**
 * Replace all console methods with stderr or silent implementations
 * This ensures no accidental stdout usage interferes with MCP communication
 */
export function installSafeConsole() {
  // Store original console methods
  const originalConsole = {
    log: console.error,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Override with safe implementations
  console.error = function(...args) {
    console.error(...args);
  };
  
  console.info = function(...args) {
    console.error('[INFO]', ...args);
  };
  
  console.warn = function(...args) {
    console.error('[WARN]', ...args);
  };
  
  console.debug = function(...args) {
    if (DEBUG) {
      console.error('[DEBUG]', ...args);
    }
  };
  
  // Return a function to restore original console if needed
  return function restoreConsole() {
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  };
}

// Export default logger
export default logger;
