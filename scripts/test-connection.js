/**
 * This script tests the connection to HaloPSA API
 * Run with: node scripts/test-connection.js
 */
import dotenv from 'dotenv';
import { createAuthenticatedClient } from '../dist/auth.js';

// Load environment variables
dotenv.config();

async function testConnection() {
  try {
    console.log('Testing connection to HaloPSA API...');
    
    // Create authenticated client
    const client = await createAuthenticatedClient();
    
    // Make a simple API call to test the connection
    console.log('Attempting to get workflow list...');
    const response = await client.get('/Workflow', { params: { limit: 1 } });
    
    if (response.status === 200) {
      console.log('✅ Connection successful!');
      console.log(`Retrieved ${response.data.length} workflow(s)`);
      
      if (response.data.length > 0) {
        const workflow = response.data[0];
        console.log('Sample workflow:');
        console.log(`- ID: ${workflow.id}`);
        console.log(`- Name: ${workflow.name}`);
      }
    } else {
      console.error('❌ Connection failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Connection failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testConnection();
