/**
 * Email Integration Testing Framework
 * 
 * This module provides comprehensive testing capabilities for the email integration system.
 * It includes mock providers, test runners, and utilities for testing all aspects of email
 * functionality including providers, processing, security, notifications, and audit logging.
 */

export { MockEmailProvider, MockEmailProviderFactory } from './MockEmailProvider';
export { EmailTestRunner } from './EmailTestRunner';

// Test utilities
export * from './testUtils';

/**
 * Quick test runner for common scenarios
 */
export async function runQuickTests(): Promise<void> {
  const testRunner = new EmailTestRunner();
  const results = await testRunner.runAllTests();
  
  const report = testRunner.generateReport(results);
  console.log(report);
  
  // Return summary
  const totalTests = results.reduce((sum, suite) => sum + suite.totalTests, 0);
  const totalPassed = results.reduce((sum, suite) => sum + suite.passedTests, 0);
  const successRate = (totalPassed / totalTests) * 100;
  
  console.log(`\n🎯 Test Summary: ${totalPassed}/${totalTests} passed (${successRate.toFixed(1)}%)`);
  
  if (successRate < 100) {
    throw new Error(`Some tests failed. Success rate: ${successRate.toFixed(1)}%`);
  }
}

/**
 * Test specific provider
 */
export async function testProvider(
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'GENERIC_IMAP' | 'GENERIC_POP3'
): Promise<boolean> {
  const testRunner = new EmailTestRunner();
  const results = await testRunner.runProviderTests();
  
  console.log(`Provider Tests (${provider}):`, results);
  
  return results.failedTests === 0;
}

/**
 * Test email processing pipeline
 */
export async function testProcessingPipeline(): Promise<boolean> {
  const testRunner = new EmailTestRunner();
  const results = await testRunner.runProcessingTests();
  
  console.log('Processing Tests:', results);
  
  return results.failedTests === 0;
}

/**
 * Test security features
 */
export async function testSecurityFeatures(): Promise<boolean> {
  const testRunner = new EmailTestRunner();
  const results = await testRunner.runSecurityTests();
  
  console.log('Security Tests:', results);
  
  return results.failedTests === 0;
}