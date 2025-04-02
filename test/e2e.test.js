#!/usr/bin/env node

/**
 * HaloPSA Workflows MCP End-to-End Tests
 * 
 * Runs all tests in sequence to verify full functionality
 */
import apiTests from './api.test.js';
import mcpTests from './mcp.test.js';

async function runE2ETests() {
  console.log('==================================');
  console.log('HaloPSA Workflows MCP E2E Test Suite');
  console.log('==================================\n');
  
  try {
    // Run API tests first
    console.log('Running API tests...');
    const apiResult = await apiTests();
    
    if (apiResult !== 0) {
      console.error('❌ API tests failed. Aborting E2E tests.');
      return 1;
    }
    
    console.log('\n----------------------------------\n');
    
    // Run MCP tests
    console.log('Running MCP server tests...');
    const mcpResult = await mcpTests();
    
    if (mcpResult !== 0) {
      console.error('❌ MCP tests failed.');
      return 1;
    }
    
    console.log('\n==================================');
    console.log('✅ All E2E tests passed successfully!');
    console.log('==================================\n');
    
    return 0;
  } catch (error) {
    console.error(`\n❌ E2E tests failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return 1;
  }
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runE2ETests().then(
    code => process.exit(code)
  );
}

export default runE2ETests;
