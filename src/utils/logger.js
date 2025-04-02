/**
 * Logger Utility
 * Standardized logging functionality for the entire application
 */
import config from '../config/index.js';

// Create logger instance based on configuration
const isDebug = config.isDebug();

/**
 * Logger with consistent format and log level filtering
 */
const logger = {
  debug: (message) => {
    if (isDebug) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [DEBUG] ${message}`);
    }
  },
  
  info: (message) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [INFO] ${message}`);
  },
  
  warn: (message) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [WARN] ${message}`);
  },
  
  error: (message) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`);
  }
};

export default logger;
