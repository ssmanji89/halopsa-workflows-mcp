#!/bin/bash

# Print debugging information
echo "Testing HaloPSA Workflow MCP Server manually"
echo "Current directory: $(pwd)"

# Ensure we're in the correct directory
cd "$(dirname "$0")"
echo "Changed to directory: $(pwd)"

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
    echo "Environment variables loaded"
else
    echo "WARNING: .env file not found"
fi

# Check environment variables
echo "Checking environment variables:"
if [ -n "$HALOPSA_BASE_URL" ]; then
    echo "HALOPSA_BASE_URL is set"
else
    echo "ERROR: HALOPSA_BASE_URL is not set"
fi

if [ -n "$HALOPSA_CLIENT_ID" ]; then
    echo "HALOPSA_CLIENT_ID is set"
else
    echo "ERROR: HALOPSA_CLIENT_ID is not set"
fi

if [ -n "$HALOPSA_CLIENT_SECRET" ]; then
    echo "HALOPSA_CLIENT_SECRET is set"
else
    echo "ERROR: HALOPSA_CLIENT_SECRET is not set"
fi

# Test Node.js version
echo ""
echo "Node.js version:"
node --version

# Test npm version
echo ""
echo "npm version:"
npm --version

# Ensure the dist directory exists
if [ -d "dist" ]; then
    echo ""
    echo "dist directory exists, checking compiled files:"
    ls -la dist/
else
    echo ""
    echo "ERROR: dist directory does not exist, running build:"
    npm run build
fi

# Test server manually
echo ""
echo "Testing server initialization (press Ctrl+C to exit):"
node dist/index.js
