#!/bin/bash

# Script to launch the MCP Inspector with our HaloPSA Workflows MCP server
# Uses HTTP/SSE transport for more flexibility
# Fixed version to address port conflicts and env var issues

# Ensure script is executable
# chmod +x http-inspector-fix.sh

echo "Starting MCP Inspector with HaloPSA Workflows MCP server (HTTP mode)..."

# Find free ports for both UI and MCP server
UI_PORT=5174  # Try a different port than the default 5173
MCP_PORT=3001  # Try a different port than the default 3000

# Kill any existing MCP processes first
echo "Cleaning up any existing MCP processes..."
pkill -f "halopsa-mcp.js" || true
sleep 1

# Use process substitution to set environment variables 
# without using --env which is causing problems
LOG_LEVEL=debug USE_HTTP_TRANSPORT=true HTTP_PORT=$MCP_PORT npx -y @modelcontextprotocol/inspector --transport=http --endpoint=http://localhost:$MCP_PORT/mcp --ui-port=$UI_PORT node halopsa-mcp.js

# Note: This will launch the MCP Inspector UI in your default browser
# If it doesn't open automatically, check the console for the URL
