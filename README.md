# HaloPSA Workflows MCP

A scalable, modular Model Context Protocol (MCP) server for integrating HaloPSA workflows with Claude and other AI assistants.

## Features

- **Modular Architecture**: Clean separation of concerns with dedicated modules for API, server, and tools
- **Scalable Design**: Easy to extend with new tools and capabilities
- **Robust Error Handling**: Comprehensive error management and recovery
- **Thorough Testing**: API, MCP, and end-to-end testing suite
- **Seamless Integration**: Works with Claude Desktop and other MCP-compatible AI assistants

## Architecture

The project follows a modular architecture for maintainability and scalability:

```
src/
├── api/        # API client implementation
├── config/     # Configuration management
├── server/     # MCP server implementation
├── tools/      # MCP tools definitions
└── utils/      # Utility functions
```

## Getting Started

### Prerequisites

- Node.js v20 or higher
- HaloPSA account with API access

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ssmanji89/halopsa-workflows-mcp.git
   cd halopsa-workflows-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your HaloPSA credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

### Usage

Start the MCP server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Testing

### Automated Tests

Run all tests:

```bash
npm run test:all
```

Or run individual test suites:

```bash
# Test API functionality
npm run test:api

# Test MCP functionality
npm run test:mcp

# Run complete end-to-end tests
npm run test:e2e
```

### Interactive Testing with MCP Inspector

The project includes an interactive testing tool using the MCP Inspector:

#### Fixed Inspector Scripts (Recommended)

The following scripts have been updated to handle common issues:

```bash
# Start the MCP Inspector with stdio transport (fixed version)
./inspector-fix.sh

# Start the MCP Inspector with HTTP transport (fixed version)
./http-inspector-fix.sh

# Kill any hanging processes (use before starting inspector if you encounter issues)
./kill-inspector.sh
```

#### Original Scripts

```bash
# Start the MCP Inspector with stdio transport
./inspector.sh

# Start the MCP Inspector with HTTP transport
./http-inspector.sh
```

The MCP Inspector will launch in your browser, allowing you to:
- Test all tools interactively
- View detailed logs and message traffic
- Inspect server capabilities
- Test with different client configurations
- View protocol messages in real-time

The MCP Inspector is the recommended approach for development and debugging purposes. It provides a more interactive and visual way to test than automated test scripts.

##### Troubleshooting Inspector Connection

If you encounter connection issues with the inspector:
1. Run `./kill-inspector.sh` to terminate any hanging processes
2. Try a fixed script: `./inspector-fix.sh` or `./http-inspector-fix.sh`
3. If you see "address already in use" errors, use a different port
4. Check console logs for detailed error messages
5. Make sure all dependencies are installed with `npm install`
6. Try the alternative transport mode (stdio vs HTTP)

## MCP Tools

The following tools are available through the MCP server:

- `getWorkflows`: Get a list of workflows from HaloPSA
- `getWorkflowSteps`: Get workflow steps from HaloPSA
- `getWorkflow`: Get a single workflow by ID
- `deleteWorkflow`: Delete a workflow by ID
- `createWorkflows`: Create new workflows
- `healthcheck`: Check server and API health

## Compatibility

This server is compatible with:

- Claude Desktop
- Any MCP-compatible client (via stdio transport)
- Claude models including claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet, and claude-3-7-sonnet

## Development

### Project Structure

```
halopsa-workflows-mcp/
├── src/              # Source code
│   ├── api/          # API client implementation
│   ├── config/       # Configuration management
│   ├── server/       # MCP server implementation
│   ├── tools/        # MCP tools definitions
│   └── utils/        # Utility functions
├── test/             # Test suites
│   ├── api.test.js   # API client tests
│   ├── mcp.test.js   # MCP server tests
│   └── e2e.test.js   # End-to-end tests
├── halopsa-mcp.js    # Main entry point
└── package.json      # Project metadata
```

### Adding New Tools

To add a new tool, add its definition to `src/tools/index.js`:

```javascript
tools.push({
  name: 'newTool',
  description: 'Description of the new tool',
  parameters: {
    type: 'object',
    properties: {
      // Define parameters here
    }
  },
  execute: async (params, { log }) => {
    // Implement tool logic here
  }
});
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Suleman Manji <ssmanji89@github.com>
