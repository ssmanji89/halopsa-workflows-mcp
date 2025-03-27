#!/bin/bash

# Get token
echo "Getting authentication token..."
TOKEN_RESPONSE=$(curl -s "https://houstontechdev.halopsa.com/auth/token?tenant=houstontechdev" \
  -X POST \
  -d "grant_type=client_credentials&client_id=c44738ff-c194-4fbc-ba8f-3670da78858a&client_secret=be36eaa2-8e95-462a-9efe-cf91158128f0-8de95559-9524-47b3-b7-4ced4f8d7244" \
  -H "Content-Type: application/x-www-form-urlencoded")

# Extract token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get token. Response:"
  echo $TOKEN_RESPONSE
  exit 1
fi

echo "Token received: ${ACCESS_TOKEN:0:10}..."

# Test workflow endpoint
echo -e "\nTesting workflow endpoint..."
WORKFLOW_RESPONSE=$(curl -s "https://houstontechdev.halopsa.com/api/Workflow" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json")

echo "Response from workflow endpoint:"
echo $WORKFLOW_RESPONSE | head -c 500
echo -e "\n...(truncated)"

# Test workflow step endpoint
echo -e "\nTesting workflow step endpoint..."
STEP_RESPONSE=$(curl -s "https://houstontechdev.halopsa.com/api/WorkflowStep" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json")

echo "Response from workflow step endpoint:"
echo $STEP_RESPONSE | head -c 500
echo -e "\n...(truncated)"

echo -e "\nTest completed!"
