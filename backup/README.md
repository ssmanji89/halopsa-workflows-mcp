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
        "HALOPSA_BASE_URL": "https://your-halopsa-instance.com",
        "HALOPSA_CLIENT_ID": "your-client-id",
        "HALOPSA_CLIENT_SECRET": "your-client-secret",
        "HALOPSA_TENANT": "your-tenant-name",
        "HALOPSA_SCOPE": "all"
      }
    }
  }
}
```

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
HALOPSA_BASE_URL=https://your-halopsa-instance.com
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
HALOPSA_TENANT=your-tenant-name
HALOPSA_SCOPE=all           # Required permissions scope (default: "all")
LOG_LEVEL=info              # optional, values: error, warn, info, debug
```

### Important Configuration Notes:

1. **HALOPSA_BASE_URL**: The base URL of your HaloPSA instance without trailing slashes or "/api"
2. **HALOPSA_TENANT**: Your tenant name is required for authentication
3. **HALOPSA_SCOPE**: Must include any application permissions required (if unsure, use "all")
4. **API Endpoint Case Sensitivity**: HaloPSA API is case-sensitive (e.g., "/Workflow" not "/workflows")

## Important Update (March 2025)

The HaloPSA API requires several key configurations that have been updated in this version:

1. **Tenant Parameter**: The authentication endpoint requires the tenant name as a URL parameter. This is now configured using the `HALOPSA_TENANT` environment variable.

2. **API Endpoint Case Sensitivity**: HaloPSA API endpoints are case-sensitive:
   - Use `/Workflow` (capital W) for workflows endpoint
   - Use `/WorkflowStep` (capital W and S) for workflow steps endpoint

3. **Scope Parameter**: The authentication process requires a scope parameter that defines the permissions needed. This is now configured using the `HALOPSA_SCOPE` environment variable (defaults to "all").

If you were experiencing authentication or 404 errors with previous versions, please update your configuration with these parameters and rebuild the project.

## Development Mode

For development and testing, you can use the following commands:

```bash
# Run with auto-reload on changes
npm run dev

# Test the direct API implementation
npm run test
```

## Available MCP Tools

### getWorkflows

Get a list of workflows from HaloPSA.

Parameters:
- `includeinactive` (optional): Whether to include inactive workflows

### getWorkflowSteps

Get a list of workflow steps from HaloPSA.

Parameters:
- `includecriteriainfo` (optional): Include criteria information in the workflow steps

### getWorkflow

Get a single workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID
- `includedetails` (optional): Include workflow details in the response

### deleteWorkflow

Delete a workflow from HaloPSA by ID.

Parameters:
- `id` (required): The workflow ID to delete

### createWorkflows

Create new workflows in HaloPSA.

Parameters:
- `workflows` (required): Array of workflow objects to create

## For Claude Users

Not sure how to get started? Try asking Claude:

- "Can you list all the workflows in my HaloPSA instance?"
- "Get the details of a specific workflow by ID"
- "Show me the steps for a specific workflow"
- "Create a new workflow for handling client onboarding"

## Troubleshooting

If you encounter authentication errors:

1. **Check Client Credentials**: Ensure your Client ID and Client Secret are correct
2. **Verify Tenant Name**: Make sure the tenant name matches your HaloPSA instance
3. **Scope Configuration**: Ensure the HALOPSA_SCOPE is set (default is "all")
4. **URL Format**: Ensure the BASE_URL doesn't include trailing slashes or "/api"
5. **API Endpoint Case**: Remember that HaloPSA API endpoints are case-sensitive

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastMCP](https://github.com/punkpeye/fastmcp) - TypeScript framework for building MCP servers
- [HaloPSA API](https://halopsa.com) - Professional Services Automation platform
