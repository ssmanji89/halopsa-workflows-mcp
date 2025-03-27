# HaloPSA Workflows MCP

A TypeScript MCP server for interacting with HaloPSA Workflows API, updated with a fresh implementation to address authentication and API endpoint issues.

## Architecture

This implementation consists of two main components:

1. **Direct HaloPSA API Implementation** (`halopsa-direct.js`): A clean, focused implementation that handles authentication and API calls directly to the HaloPSA API.

2. **MCP Wrapper** (`halopsa-mcp.js`): A thin wrapper around the direct implementation that provides the MCP interface for Claude Desktop and other AI assistants.

## Key Features

- Reliable Claude Desktop integration with proper connection handling
- Tenant parameter for authentication
- Proper scope parameter for API access
- Case-sensitive API endpoint handling
- Clear error messaging
- Token caching for performance
- Detailed logging
- Graceful shutdown handling

## Tools Provided

The MCP server provides the following tools to Claude and other compatible AI assistants:

- `getWorkflows`: Get a list of workflows from HaloPSA
- `getWorkflowSteps`: Get a list of workflow steps from HaloPSA
- `getWorkflow`: Get a single workflow from HaloPSA by ID
- `deleteWorkflow`: Delete a workflow from HaloPSA by ID
- `createWorkflows`: Create new workflows in HaloPSA

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/ssmanji89/halopsa-workflows-mcp.git
cd halopsa-workflows-mcp

# Install dependencies
npm install

# Create a .env file (see below)
cp .env.example .env
# Edit the .env file with your credentials

# Build the package
npm run build

# Start the server
npm start
```

### Configuration

Create a `.env` file with your HaloPSA API credentials:

```
# HaloPSA API Configuration
HALOPSA_BASE_URL=https://your-instance.halopsa.com
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
HALOPSA_TENANT=your-tenant-name
HALOPSA_SCOPE=all
LOG_LEVEL=info
```

### Important Notes

1. The `HALOPSA_BASE_URL` should not include trailing slashes or "/api"
2. The `HALOPSA_TENANT` is required for authentication
3. The `HALOPSA_SCOPE` must be set (default is "all")
4. For debugging, set `LOG_LEVEL=debug`

## Claude Desktop Integration

To integrate with Claude Desktop, create a `claude_desktop_config.json` file in the appropriate location for your OS:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Example configuration:

```json
{
  "halopsa-workflows": {
    "command": "npx",
    "args": ["-y", "halopsa-workflows-mcp@latest"],
    "env": {
      "HALOPSA_BASE_URL": "https://your-instance.halopsa.com",
      "HALOPSA_CLIENT_ID": "your-client-id",
      "HALOPSA_CLIENT_SECRET": "your-client-secret",
      "HALOPSA_TENANT": "your-tenant-name"
    }
  }
}
```

For development, you can point to your local build:

```json
{
  "halopsa-workflows": {
    "command": "node",
    "args": ["/path/to/halopsa-workflows-mcp/dist/halopsa-mcp.js"],
    "env": {
      "HALOPSA_BASE_URL": "https://your-instance.halopsa.com",
      "HALOPSA_CLIENT_ID": "your-client-id",
      "HALOPSA_CLIENT_SECRET": "your-client-secret",
      "HALOPSA_TENANT": "your-tenant-name",
      "LOG_LEVEL": "debug"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: If you see messages like "Client disconnected unexpectedly", ensure you're using the latest version of the package and your claude_desktop_config.json is correct.

2. **Authentication Failures**: Ensure your `HALOPSA_TENANT` is correctly set alongside the client ID and secret.

3. **API Errors**: Check that your `HALOPSA_BASE_URL` does not include a trailing slash or "/api" suffix.

### Debugging

To enable detailed logging, set `LOG_LEVEL=debug` in your .env file or in the environment variables for the claude_desktop_config.json.

Check the Claude Desktop logs for detailed error messages:

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
Get-Content -Path "$env:APPDATA\Claude\Logs\mcp*.log" -Wait

# Linux
tail -f ~/.local/share/Claude/logs/mcp*.log
```

## Testing

To test the direct API implementation:

```bash
npm run test
```

## Development

For development with auto-reload:

```bash
npm run dev
```

## License

MIT
