#!/usr/bin/env node

/**
 * HaloPSA API Client Test
 * Tests direct API functionality without MCP
 */
import apiClient from '../src/api/client.js';

async function runApiTests() {
  console.log('=== HaloPSA API Client Tests ===');
  
  try {
    // Test authentication
    console.log('\n[TEST] Authentication');
    const token = await apiClient.getAuthToken();
    console.log('✅ Authentication successful');
    
    // Test getting workflows
    console.log('\n[TEST] Get Workflows');
    const workflows = await apiClient.getWorkflows(true);
    console.log(`✅ Retrieved ${workflows.length} workflows`);
    
    // Test getting workflow steps
    console.log('\n[TEST] Get Workflow Steps');
    try {
      const steps = await apiClient.getWorkflowSteps(true);
      console.log(`✅ Retrieved ${steps.length} workflow steps`);
    } catch (error) {
      console.log(`⚠️ Workflow steps not available: ${error.message}`);
    }
    
    // Test getting a specific workflow
    if (workflows.length > 0) {
      console.log('\n[TEST] Get Workflow Details');
      const workflow = await apiClient.getWorkflow(workflows[0].id, true);
      console.log(`✅ Retrieved workflow ${workflows[0].id} details`);
    }
    
    console.log('\n✅ API Tests completed successfully!\n');
    return 0;
  } catch (error) {
    console.error(`\n❌ Tests failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return 1;
  }
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runApiTests().then(
    code => process.exit(code)
  );
}

export default runApiTests;
