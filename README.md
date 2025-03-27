# HaloPSA Workflows MCP Server

A Model Context Protocol (MCP) server that integrates with HaloPSA API to provide workflow management functionality for Claude Desktop and other AI assistants.

## Features

- Seamless integration with Claude Desktop
- Authentication with HaloPSA API
- Get workflow steps and details
- Create and manage workflows
- Built with FastMCP for enhanced development experience
- Comprehensive error handling and logging

## Installation

### For Claude Desktop Users

```bash
# Install globally
npm install -g halopsa-workflows-mcp
```

Configure Claude Desktop by editing your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "halopsa-workflow": {
      "command": "halopsa-workflows-mcp",
      "env": {
        "HALOPSA_BASE_URL": "https://your-halopsa-instance.com/api",
        "HALOPSA_CLIENT_ID": "your-client-id",
        "HALOPSA_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

See our [Claude Desktop Integration Guide](./docs/CLAUDE_DESKTOP.md) for detailed instructions.

### For Developers

```bash
# Clone the repository
git clone https://github.com/ssmanji89/halopsa-workflows-mcp.git
cd halopsa-workflows-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Configuration

Create a `.env` file in the root directory with your HaloPSA API credentials:

```
HALOPSA_BASE_URL=https://your-halopsa-instance.com/api
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
LOG_LEVEL=info  # optional, values: error, warn, info, debug
```

## Development Mode

For development and testing, you can use the FastMCP CLI:

```bash
# Run with FastMCP dev mode (auto-reload on changes)
npm run dev

# Run with MCP Inspector for interactive testing
npm run inspect

# Test with dev environment
npm run test:dev
```

## Available MCP Tools

### getWorkflowSteps

Get a list of workflow steps from HaloPSA.

Parameters:
- `includecriteriainfo` (optional): Include criteria information in the workflow steps

### getWorkflows

Get a list of workflows from HaloPSA.

Parameters:
- `access_control_level` (optional): Access control level for filtering
- `includeinactive` (optional): Whether to include inactive workflows

### createWorkflows

Create new workflows in HaloPSA.

Parameters:
- `workflows` (required): Array of workflow objects to create

### getWorkflow

Get a single workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID
- `includedetails` (optional): Include workflow details in the response

### deleteWorkflow

Delete a workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID to delete

For detailed tool parameters and usage examples, see the [Example Prompts](./docs/EXAMPLE_PROMPTS.md) documentation.

## For Claude Users

Not sure how to get started? Try asking Claude:

- "Can you list all the workflows in my HaloPSA instance?"
- "Get the details of a specific workflow by ID"
- "Show me the steps for a specific workflow"
- "Create a new workflow for handling client onboarding"

## Error Handling

The server implements comprehensive error handling with detailed error messages. Errors from the HaloPSA API are properly propagated with context to help with debugging.

## Logging

Logging is controlled via the `LOG_LEVEL` environment variable:

- `error`: Only log errors
- `warn`: Log errors and warnings
- `info`: Log errors, warnings, and informational messages (default)
- `debug`: Log all messages including debug information

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