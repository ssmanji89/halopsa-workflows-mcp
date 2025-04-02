#!/bin/bash

# Script to launch the MCP Inspector with our HaloPSA Workflows MCP server
# Uses HTTP/SSE transport for more flexibility

# Ensure script is executable
# chmod +x http-inspector.sh

echo "Starting MCP Inspector with HaloPSA Workflows MCP server (HTTP mode)..."

# Set environment variables for the server
export LOG_LEVEL=debug
export USE_HTTP_TRANSPORT=true
export HTTP_PORT=3000

# Use npx to run the inspector with our server in HTTP mode
npx -y @modelcontextprotocol/inspector --transport=http --endpoint=http://localhost:3000/mcp node halopsa-mcp.js

# Note: This will launch the MCP Inspector UI in your default browser
# If it doesn't open automatically, check the console for the URL
