#!/bin/bash

# Script to kill any running MCP Inspector or server processes
# This is useful if you encounter port conflicts or hanging processes

echo "Killing any running MCP Inspector and server processes..."

# Kill MCP server processes
pkill -f "halopsa-mcp.js" || true

# Kill any processes using port 5173 (default MCP Inspector UI port)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Kill any processes using port 5174 (our alternative UI port)
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

# Kill any processes using port 3000 (default MCP HTTP port)
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill any processes using port 3001 (our alternative HTTP port)
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "Done! You can now start the MCP Inspector again."
