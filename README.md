# HaloPSA Workflows MCP

A Model Context Protocol (MCP) server for HaloPSA Workflows integration with AI assistants.

## About

This project provides an MCP server implementation that allows AI assistants like Claude to interact with HaloPSA workflows through a standardized protocol. It enables AI assistants to retrieve, create, and manage workflows within HaloPSA.

## Installation

```bash
npm install halopsa-workflows-mcp
```

## Configuration

Create a `.env` file with your HaloPSA credentials:

```
# HaloPSA API Configuration
HALOPSA_BASE_URL=https://your-instance.halopsa.com
HALOPSA_TENANT=your-tenant
HALOPSA_CLIENT_ID=your-client-id
HALOPSA_CLIENT_SECRET=your-client-secret
HALOPSA_SCOPE=all

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE=./logs/halopsa-mcp-server.log
```

## Usage

### As a standalone server

```bash
npm start
```

### As a library

```javascript
import { createMcpServer } from 'halopsa-workflows-mcp';

const server = createMcpServer();
server.start();
```

## Available Tools

This MCP server provides the following tools to AI assistants:

- `getWorkflows`: Get a list of workflows from HaloPSA
- `getWorkflowSteps`: Get a list of workflow steps from HaloPSA
- `getWorkflow`: Get a single workflow from HaloPSA by ID
- `deleteWorkflow`: Delete a workflow from HaloPSA by ID
- `createWorkflows`: Create new workflows in HaloPSA

## Compatibility

This package is designed to work with MCP clients that follow the standard JSON-RPC over stdio protocol. For compatibility details and troubleshooting, see [COMPATIBILITY.md](./COMPATIBILITY.md).

## Development

### Building from source

```bash
npm run build
```

### Running tests

```bash
npm test
```

## License

MIT
