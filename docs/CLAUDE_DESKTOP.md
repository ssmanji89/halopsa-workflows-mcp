# Setting up HaloPSA Workflows MCP with Claude Desktop

This guide will help you integrate the HaloPSA Workflows MCP server with Claude Desktop.

## Prerequisites

- [Node.js](https://nodejs.org/) 16 or higher
- [Claude Desktop](https://www.anthropic.com/claude) application
- HaloPSA instance with API access

## Installation

1. Install the package globally:
   ```bash
   npm install -g halopsa-workflows-mcp
   ```

2. Configure Claude Desktop:
   Edit your Claude Desktop configuration file located at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

3. Add the following MCP server configuration:
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

4. Restart Claude Desktop to apply changes

## Verification

1. Open Claude Desktop
2. Type "Can you check if you have access to HaloPSA workflows?"
3. Claude should confirm it can access the HaloPSA Workflow MCP server

## Troubleshooting

- Check logs at:
  - macOS: `~/Library/Logs/Claude/mcp-halopsa-workflow.log`
  - Windows: `%APPDATA%\Claude\logs\mcp-halopsa-workflow.log`
  - Linux: `~/.config/Claude/logs/mcp-halopsa-workflow.log`

- Common issues:
  - **Authentication Errors**: Verify your Client ID and Client Secret are correct
  - **Connection Errors**: Ensure your HaloPSA instance is accessible from your network
  - **Permissions Issues**: Make sure the API client has appropriate permissions in HaloPSA

## Example Claude Prompts

Try these prompts to test the integration:

- "Can you list all the workflows in my HaloPSA instance?"
- "What are the steps in workflow ID 123?"
- "Can you help me create a new workflow for ticket escalation?"

## Advanced Configuration

For advanced configuration options, such as logging levels and timeout settings, create a `.env` file in the same directory where you run the command:

```
HALOPSA_BASE_URL=https://your-halopsa-instance.com/api
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
LOG_LEVEL=debug  # Supported: error, warn, info, debug
```

## Using with Development Environment

For testing with the HaloPSA development environment, use the following configuration:

```json
{
  "mcpServers": {
    "halopsa-workflow": {
      "command": "halopsa-workflows-mcp",
      "env": {
        "HALOPSA_BASE_URL": "https://houstontechdev.halopsa.com/api",
        "HALOPSA_CLIENT_ID": "c44738ff-c194-4fbc-ba8f-3670da78858a",
        "HALOPSA_CLIENT_SECRET": "be36eaa2-8e95-462a-9efe-cf91158128f0-8de95559-9524-47b3-b3c7-4ced4f8d7244"
      }
    }
  }
}
```

## Need Help?

If you encounter issues with the MCP server integration, please:

1. Check the logs for specific error messages
2. Verify your HaloPSA API credentials
3. Submit an issue on our [GitHub repository](https://github.com/ssmanji89/halopsa-workflows-mcp/issues)