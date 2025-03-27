# HaloPSA Workflows MCP Server API Reference

This document provides a detailed API reference for the HaloPSA Workflows MCP Server.

## MCP Tools

### getWorkflowSteps

Retrieves workflow steps from the HaloPSA API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| includecriteriainfo | boolean | No | Whether to include criteria information in the workflow steps |

**Returns:**

A JSON string containing an array of workflow steps with the following structure:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "flowheader_id": 456,
      "name": "Step Name",
      "step_type": 1,
      "description": "Step Description",
      ...
    },
    ...
  ],
  "count": 10
}
```

**Example:**

```json
{
  "includecriteriainfo": true
}
```

### getWorkflows

Retrieves workflow headers from the HaloPSA API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| access_control_level | number | No | Access control level for filtering |
| includeinactive | boolean | No | Whether to include inactive workflows |

**Returns:**

A JSON string containing an array of workflow headers:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Workflow Name",
      "description": "Workflow Description",
      "active": true,
      ...
    },
    ...
  ],
  "count": 5
}
```

**Example:**

```json
{
  "includeinactive": true
}
```

### createWorkflows

Creates new workflow headers in the HaloPSA API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflows | array | Yes | Array of workflow objects to create |

**Returns:**

A JSON string containing the created workflow headers:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "New Workflow",
      "description": "New Workflow Description",
      "active": true,
      ...
    },
    ...
  ],
  "count": 1
}
```

**Example:**

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

Retrieves a single workflow header by ID from the HaloPSA API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | The workflow ID |
| includedetails | boolean | No | Whether to include workflow details |

**Returns:**

A JSON string containing the workflow header:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Workflow Name",
    "description": "Workflow Description",
    "active": true,
    ...
  }
}
```

**Example:**

```json
{
  "id": 123,
  "includedetails": true
}
```

### deleteWorkflow

Deletes a workflow header by ID from the HaloPSA API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | number | Yes | The workflow ID to delete |

**Returns:**

A JSON string indicating success:

```json
{
  "success": true,
  "message": "Workflow 123 deleted successfully"
}
```

**Example:**

```json
{
  "id": 123
}
```

## MCP Resources

### Server Information

**URI:** `info://server`

**Returns:**

A plain text string containing information about the server.

## Error Handling

All tools can throw errors which will be propagated to the MCP client. Errors have the following format:

```
Error: Failed to [operation]: [error message]
```

Common error types:

- Authentication errors
- Not found errors
- Validation errors
- Network errors
- Server errors

## TypeScript Interfaces

The server provides TypeScript interfaces for HaloPSA workflow objects:

- `FlowHeader`: Represents a workflow header
- `FlowDetail`: Represents a workflow step
- `WorkflowTarget`: Represents a workflow target
- `WorkflowTargetStep`: Represents a step in a workflow target
- `WorkflowHistory`: Represents a workflow history record

These interfaces are available in the `types.ts` file and can be imported and used in your TypeScript code.
