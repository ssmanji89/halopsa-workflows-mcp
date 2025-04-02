#!/bin/bash

# Script to launch the MCP Inspector with our HaloPSA Workflows MCP server
# Uses the MCP Inspector documentation guidelines
# Fixed version to address port conflicts and env var issues

# Ensure script is executable
# chmod +x inspector-fix.sh

echo "Starting MCP Inspector with HaloPSA Workflows MCP server..."

# Find a free port for the UI
UI_PORT=5174  # Try a different port than the default 5173

# Set environment variables explicitly using --env key=value format
export LOG_LEVEL=debug

# Kill any existing MCP processes first
echo "Cleaning up any existing MCP processes..."
pkill -f "halopsa-mcp.js" || true
sleep 1

# Use npx to run the inspector with our server
# Explicitly specify the stdio transport and UI port
npx -y @modelcontextprotocol/inspector --transport=stdio --ui-port=$UI_PORT node halopsa-mcp.js

# Note: This will launch the MCP Inspector UI in your default browser
# If it doesn't open automatically, check the console for the URL
