#!/usr/bin/env node

/**
 * Email Integration Test Runner Script
 * 
 * Usage:
 *   npm run test:email
 *   node -r tsx/cjs src/lib/email/testing/runTests.ts
 *   npx tsx src/lib/email/testing/runTests.ts
 */

import { EmailTestRunner } from './EmailTestRunner';
import { createTestData, cleanupTestData } from './testUtils';

async function main() {
  console.log('🚀 Starting Email Integration Tests...\n');
  
  let testData: any = null;
  
  try {
    // Create test data
    console.log('📋 Setting up test data...');
    testData = await createTestData();
    console.log('✅ Test data created\n');
    
    // Initialize test runner
    const testRunner = new EmailTestRunner({
      accountId: testData.account.id,
      integrationId: testData.integration.id,
      cleanupAfter: true
    });
    
    // Run all tests
    console.log('🧪 Running test suites...\n');
    const results = await testRunner.runAllTests();
    
    // Generate and display report
    const report = testRunner.generateReport(results);
    console.log(report);
    
    // Calculate overall results
    const totalTests = results.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = results.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = results.reduce((sum, suite) => sum + suite.failedTests, 0);
    const successRate = (totalPassed / totalTests) * 100;
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} ✅`);
    console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (totalFailed > 0) {
      console.log('\n❌ Some tests failed. Please check the report above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    process.exit(1);
    
  } finally {
    // Cleanup test data
    if (testData) {
      try {
        console.log('\n🧹 Cleaning up test data...');
        await cleanupTestData(testData);
        console.log('✅ Test data cleaned up');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test data:', cleanupError);
      }
    }
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(143);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}