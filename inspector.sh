#!/bin/bash

# Script to launch the MCP Inspector with our HaloPSA Workflows MCP server
# Uses the MCP Inspector documentation guidelines

# Ensure script is executable
# chmod +x inspector.sh

echo "Starting MCP Inspector with HaloPSA Workflows MCP server..."

# Set environment variables for debugging
export LOG_LEVEL=debug

# Use npx to run the inspector with our server
# Explicitly specify the stdio transport which is what our server supports
npx -y @modelcontextprotocol/inspector --transport=stdio node halopsa-mcp.js

# Note: This will launch the MCP Inspector UI in your default browser
# If it doesn't open automatically, check the console for the URL
