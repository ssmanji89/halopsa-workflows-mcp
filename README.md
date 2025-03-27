# HaloPSA Workflows MCP Server

A Model Context Protocol (MCP) server that integrates with HaloPSA API to provide workflow management functionality. This server allows AI assistants and other MCP clients to interact with HaloPSA workflows through a standardized interface.

## Features

- Authentication with HaloPSA API
- Get workflow steps and details
- Retrieve, create, and delete workflows
- Built with FastMCP for enhanced development experience
- Comprehensive error handling and logging
- Claude Desktop and other MCP client integration

## Installation

```bash
# Install from npm
npm install halopsa-workflows-mcp

# Or clone the repository
git clone https://github.com/ssmanji89/halopsa-workflows-mcp.git
cd halopsa-workflows-mcp
npm install
```

## Configuration

Create a `.env` file in the root directory with your HaloPSA API credentials:

```
HALOPSA_BASE_URL=https://your-halopsa-instance.com/api
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
LOG_LEVEL=info  # optional, values: error, warn, info, debug
```

## Usage

### Running the Server

```bash
# Build the TypeScript files
npm run build

# Start the server
npm start
```

### Development Mode

For development and testing, you can use the FastMCP CLI:

```bash
# Run with FastMCP dev mode (auto-reload on changes)
npm run dev

# Run with MCP Inspector for interactive testing
npm run inspect
```

## Integration with Claude Desktop

To integrate with Claude Desktop, add the following configuration to your Claude Desktop settings (typically found at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "halopsa-workflow": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/path/to/halopsa-workflows-mcp",
      "env": {
        "HALOPSA_BASE_URL": "https://your-halopsa-instance.com/api",
        "HALOPSA_CLIENT_ID": "your-client-id",
        "HALOPSA_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Available MCP Tools

### getWorkflowSteps

Get a list of workflow steps from HaloPSA.

Parameters:
- `includecriteriainfo` (optional): Include criteria information in the workflow steps

Example:
```json
{
  "includecriteriainfo": true
}
```

### getWorkflows

Get a list of workflows from HaloPSA.

Parameters:
- `access_control_level` (optional): Access control level for filtering
- `includeinactive` (optional): Whether to include inactive workflows

Example:
```json
{
  "includeinactive": true
}
```

### createWorkflows

Create new workflows in HaloPSA.

Parameters:
- `workflows` (required): Array of workflow objects to create

Example:
```json
{
  "workflows": [
    {
      "name": "New Support Workflow",
      "description": "Workflow for handling support tickets",
      "active": true
    }
  ]
}
```

### getWorkflow

Get a single workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID
- `includedetails` (optional): Include workflow details in the response

Example:
```json
{
  "id": 123,
  "includedetails": true
}
```

### deleteWorkflow

Delete a workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID to delete

Example:
```json
{
  "id": 123
}
```

## MCP Resources

### Server Information

URI: `info://server`

Provides basic information about the server, including available tools and their purposes.

## Error Handling

The server implements comprehensive error handling with detailed error messages. Errors from the HaloPSA API are properly propagated with context to help with debugging.

## Logging

Logging is controlled via the `LOG_LEVEL` environment variable:

- `error`: Only log errors
- `warn`: Log errors and warnings
- `info`: Log errors, warnings, and informational messages (default)
- `debug`: Log all messages including debug information

## TypeScript Definitions

The server includes TypeScript definitions for HaloPSA workflow objects, making it easier to work with the API responses in a typed environment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastMCP](https://github.com/punkpeye/fastmcp) - TypeScript framework for building MCP servers
- [HaloPSA API](https://halopsa.com) - Professional Services Automation platform
