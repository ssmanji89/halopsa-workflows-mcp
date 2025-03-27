/**
 * HaloPSA API Test Script
 * Tests direct connection to HaloPSA API
 */
import axios from 'axios';

async function testHaloPSAAPI() {
  // Configuration
  const config = {
    baseUrl: 'https://houstontechdev.halopsa.com',
    tenant: 'houstontechdev',
    clientId: 'c44738ff-c194-4fbc-ba8f-3670da78858a',
    clientSecret: 'be36eaa2-8e95-462a-9efe-cf91158128f0-8de95559-9524-47b3-b7-4ced4f8d7244'
  };

  console.log('Testing HaloPSA API Connection:');
  console.log('-------------------------------');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Tenant: ${config.tenant}`);
  console.log(`Client ID: ${config.clientId}`);
  console.log(`Client Secret: ${config.clientSecret.substring(0, 10)}...`);
  console.log();

  try {
    // Step 1: Authenticate and get token
    console.log('Step 1: Authenticating with HaloPSA...');
    const tokenUrl = `${config.baseUrl}/auth/token?tenant=${config.tenant}`;
    console.log(`Token URL: ${tokenUrl}`);

    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', config.clientId);
    formData.append('client_secret', config.clientSecret);

    const tokenResponse = await axios.post(tokenUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const token = tokenResponse.data.access_token;
    console.log(`✅ Authentication successful! Received token: ${token.substring(0, 10)}...`);
    console.log(`Token type: ${tokenResponse.data.token_type}`);
    console.log(`Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log();

    // Step 2: Test the Workflow endpoint
    console.log('Step 2: Testing Workflow endpoint...');
    const apiEndpoint = `${config.baseUrl}/api/Workflow`;
    console.log(`API Endpoint: ${apiEndpoint}`);

    const workflowResponse = await axios.get(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`✅ Workflow endpoint successful! Received ${workflowResponse.data.length} workflows`);
    console.log('First workflow:', workflowResponse.data[0]);
    console.log();
    
    // Step 3: Test the WorkflowStep endpoint (if available)
    console.log('Step 3: Testing WorkflowStep endpoint...');
    const stepEndpoint = `${config.baseUrl}/api/WorkflowStep`;
    console.log(`API Endpoint: ${stepEndpoint}`);

    try {
      const stepResponse = await axios.get(stepEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log(`✅ WorkflowStep endpoint successful! Received ${stepResponse.data.length} workflow steps`);
      if (stepResponse.data.length > 0) {
        console.log('First workflow step:', stepResponse.data[0]);
      }
    } catch (stepError) {
      console.log(`❌ WorkflowStep endpoint failed: ${stepError.message}`);
      if (stepError.response) {
        console.log(`Status: ${stepError.response.status}`);
        console.log('Response data:', stepError.response.data);
      }
    }
    console.log();

    console.log('Test completed successfully! 🎉');
  } catch (error) {
    console.error('Test failed! ❌');
    console.error(`Error: ${error.message}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testHaloPSAAPI();
