# HaloPSA Workflows MCP - Fresh Implementation

This is a fresh implementation of the HaloPSA Workflows MCP server, built from scratch to address authentication and API endpoint issues.

## Architecture

This implementation consists of two main components:

1. **Direct HaloPSA API Implementation** (`halopsa-direct.js`): A clean, focused implementation that handles authentication and API calls directly to the HaloPSA API, based on our successful curl commands.

2. **MCP Wrapper** (`halopsa-mcp.js`): A thin wrapper around the direct implementation that provides the MCP interface for Claude Desktop and other AI assistants.

## Key Features

- Tenant parameter for authentication
- Proper scope parameter for API access
- Case-sensitive API endpoint handling
- Clear error messaging
- Token caching for performance
- Detailed logging

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/ssmanji89/halopsa-workflows-mcp.git
cd halopsa-workflows-mcp/fresh-implementation

# Install dependencies
npm install

# Create a .env file (see below)
cp ../.env .

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
LOG_LEVEL=debug
```

### Important Notes

1. The `HALOPSA_BASE_URL` should not include trailing slashes or "/api"
2. The `HALOPSA_TENANT` is required for authentication
3. The `HALOPSA_SCOPE` must be set (default is "all")

## Testing

To test the direct implementation without the MCP wrapper:

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
