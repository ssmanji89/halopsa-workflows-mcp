# HaloPSA Workflows MCP Compatibility Guide

This document outlines compatibility issues and solutions for the HaloPSA Workflows MCP server.

## JSON-RPC Communication Issues

The Model Context Protocol (MCP) uses JSON-RPC over stdio for communication between the client and server. This can lead to compatibility issues when log messages are written to stdout and stderr during normal operation.

### Problem: Log Messages Interfere with JSON-RPC

The most common issue encountered is when log messages output to stdout interfere with the JSON-RPC communication. This causes errors like:

```
MCP halopsa-workflows: Unexpected token 'I', "[INFO]..." is not valid JSON
MCP halopsa-workflows: No number after minus sign in JSON at position 1
MCP halopsa-workflows: Unexpected token 'B', "Base URL:..." is not valid JSON
```

These occur because the MCP client tries to parse every line from stdout as JSON, but encounters log messages instead.

### Solution: Redirect All Logs to stderr

To prevent this issue, all log messages should be redirected from stdout to stderr:

1. Replace all `console.log()` calls with `console.error()`
2. Use the enhanced logging module provided in `patches/02-enhanced-logging.js`
3. Set the `LOG_TO_FILE=true` environment variable to redirect logs to a file

### Patches

Two patches are provided to address these issues:

1. `patches/01-fix-console-logs.patch` - Replaces all console.log calls with console.error
2. `patches/02-enhanced-logging.js` - Provides an enhanced logging module with stderr and file output

## Applying the Fixes

### Quick Fix

Run the following commands to quickly fix the issues:

```bash
# Replace console.log with console.error in key files
cd /path/to/halopsa-workflows-mcp
sed -i '' 's/console.log/console.error/g' halopsa-direct.js src/halopsa-direct.js dist/halopsa-direct.js
sed -i '' 's/console.log/console.error/g' halopsa-mcp.js src/halopsa-mcp.js dist/halopsa-mcp.js
```

### Recommended: Use Enhanced Logging

For a more robust solution, integrate the enhanced logging module:

1. Copy `patches/02-enhanced-logging.js` to `src/utils/logging.js`
2. Import and use the logger in your main files:

```javascript
import { logger, installSafeConsole } from './utils/logging.js';

// Ensure no console.log calls interfere with MCP
installSafeConsole();

// Use logger instead of console
logger.info('HaloPSA Workflows MCP Server starting');
logger.debug('Debug information');
```

### Environment Variables

Configure logging with these environment variables:

- `LOG_LEVEL`: Set to 'debug', 'info', 'warn', or 'error' (default: 'info')
- `LOG_TO_FILE`: Set to 'true' to write logs to a file (default: 'false')
- `LOG_FILE`: Path to the log file (default: './halopsa-mcp-server.log')

Example `.env` entry:
```
LOG_LEVEL=debug
LOG_TO_FILE=true
LOG_FILE=./logs/halopsa-mcp.log
```

## Testing Compatibility

Run the compatibility test to verify the fix:

```bash
node test-compatibility.js
```

A successful test will show:
```
[INFO] ====================================
[INFO] MCP COMPATIBILITY TEST SUITE PASSED
[INFO] ====================================
```
