#!/usr/bin/env node
/**
 * Test script for verifying connection to HaloPSA development environment
 * Uses the dev environment credentials to validate connectivity
 */

// Import required modules
import dotenv from 'dotenv';
import { createAuthenticatedClient } from '../dist/auth.js';

// Load environment for testing
dotenv.config();

// Set test environment variables
const originalBaseUrl = process.env.HALOPSA_BASE_URL;
const originalClientId = process.env.HALOPSA_CLIENT_ID;
const originalClientSecret = process.env.HALOPSA_CLIENT_SECRET;

// Set the dev environment credentials
process.env.HALOPSA_BASE_URL = 'https://houstontechdev.halopsa.com/api';
process.env.HALOPSA_CLIENT_ID = 'c44738ff-c194-4fbc-ba8f-3670da78858a';
process.env.HALOPSA_CLIENT_SECRET = 'be36eaa2-8e95-462a-9efe-cf91158128f0-8de95559-9524-47b3-b3c7-4ced4f8d7244';

// Create a simple progress indicator
function createSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${frames[i]} ${message}`);
    i = (i + 1) % frames.length;
  }, 80);
  
  return {
    stop: (final) => {
      clearInterval(timer);
      process.stdout.write(`\r${final}\n`);
    }
  };
}

async function runTest() {
  console.log('🔍 Testing connection to HaloPSA dev environment...\n');
  
  try {
    // Test authentication
    let spinner = createSpinner('Authenticating to HaloPSA API...');
    const client = await createAuthenticatedClient();
    spinner.stop('✅ Authentication successful');
    
    // Test fetching workflows
    spinner = createSpinner('Fetching workflows...');
    const workflowResponse = await client.get('/Workflow');
    spinner.stop(`✅ Successfully retrieved ${workflowResponse.data.length} workflows`);
    
    // Test fetching workflow steps
    spinner = createSpinner('Fetching workflow steps...');
    const stepsResponse = await client.get('/workflowstep');
    spinner.stop(`✅ Successfully retrieved ${stepsResponse.data.length} workflow steps`);
    
    // Log a sample of the data
    console.log('\n📊 Sample workflow data:');
    if (workflowResponse.data.length > 0) {
      const sampleWorkflow = workflowResponse.data[0];
      console.log(`   - ID: ${sampleWorkflow.id}`);
      console.log(`   - Name: ${sampleWorkflow.name || 'Unnamed'}`);
      console.log(`   - Description: ${sampleWorkflow.description || 'No description'}`);
      console.log(`   - Active: ${sampleWorkflow.active ? 'Yes' : 'No'}`);
    } else {
      console.log('   No workflows found in the dev environment');
    }
    
    console.log('\n✅ All tests passed! The dev environment is properly configured.');
  } catch (error) {
    console.error('\n❌ Test failed:');
    
    if (error.response) {
      console.error(`   Status code: ${error.response.status}`);
      console.error(`   Error message: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error(`   Network error: ${error.message}`);
      console.error('   Could not connect to the HaloPSA API. Please check your network connection.');
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.error('\n📋 Troubleshooting steps:');
    console.error('   1. Verify the dev environment is online');
    console.error('   2. Check your network connection');
    console.error('   3. Verify the API credentials are correct');
    console.error('   4. Ensure no firewall is blocking the connection');
    
    process.exit(1);
  } finally {
    // Restore original environment variables
    if (originalBaseUrl) process.env.HALOPSA_BASE_URL = originalBaseUrl;
    if (originalClientId) process.env.HALOPSA_CLIENT_ID = originalClientId;
    if (originalClientSecret) process.env.HALOPSA_CLIENT_SECRET = originalClientSecret;
  }
}

runTest();
