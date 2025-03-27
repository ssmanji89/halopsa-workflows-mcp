# HaloPSA Workflows MCP Server Usage Guide

This document provides detailed usage instructions for the HaloPSA Workflows MCP Server.

## Prerequisites

Before using this server, you'll need:

1. A HaloPSA instance with API access
2. API credentials (Client ID and Client Secret)
3. Node.js v16 or higher

## Authentication Setup

1. Log in to your HaloPSA admin panel
2. Navigate to System Settings > API Credentials
3. Create a new API client with necessary permissions for workflow management
4. Note the Client ID and Client Secret

## Environment Configuration

The server requires the following environment variables:

```
HALOPSA_BASE_URL=https://your-halopsa-instance.com/api
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
LOG_LEVEL=info  # optional, values: error, warn, info, debug
```

You can set these in a `.env` file in the project root or configure them directly in your environment.

## Using with Claude Desktop

### Configuration

1. Open your Claude Desktop application
2. Add the following to your `claude_desktop_config.json` file:

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

2. Restart Claude Desktop
3. The HaloPSA tools should now be available to Claude

### Example Prompts

Here are some example prompts to use with Claude:

- "Show me all active workflows in HaloPSA"
- "Get the details of workflow ID 123"
- "Create a new workflow named 'Support Ticket Process'"
- "Delete workflow ID 456"

## Using with Other MCP Clients

This server follows the Model Context Protocol standard, so it can be used with any MCP-compatible client. The communication is done via stdin/stdout, so the client needs to be able to spawn the server process and communicate with it through these channels.

## Advanced Usage

### Response Format

All tools return JSON responses with the following structure:

```json
{
  "success": true,
  "data": [...],  // The actual response data
  "count": 10     // Count of items (for list responses)
}
```

Or in case of error:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagination and Filtering

The HaloPSA API supports various filtering parameters. This MCP server exposes some of them as tool parameters, but for more advanced filtering, you may need to extend the server or use the HaloPSA API directly.

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check your Client ID and Client Secret
2. **404 Errors**: Verify your HaloPSA base URL
3. **Permission Errors**: Ensure your API client has sufficient permissions

### Logging

The server's log level can be controlled with the `LOG_LEVEL` environment variable:

```
LOG_LEVEL=debug npm start
```

This will produce verbose output to help with debugging.

### Getting Help

If you encounter issues:

1. Check the logs for detailed error messages
2. Ensure your HaloPSA API is accessible
3. Verify your credentials are correct
4. Open an issue on the GitHub repository
