# Email Integration Testing Framework

This testing framework provides comprehensive testing capabilities for the Service Vault email integration system. It includes mock providers, test runners, utilities, and automated test suites for all aspects of email functionality.

## Overview

The testing framework covers:

- **Email Providers**: Microsoft Graph, Gmail, IMAP, and POP3 providers
- **Message Processing**: Parsing, threading, filtering, and content extraction
- **Security Features**: Spam detection, malware scanning, URL validation, and sender reputation
- **Notification System**: Template-based email notifications and auto-responses
- **Audit Logging**: Comprehensive logging of all email operations and access patterns

## Quick Start

### Running All Tests

```bash
# Using npm script (if configured)
npm run test:email

# Using npx and tsx
npx tsx src/lib/email/testing/runTests.ts

# Direct node execution
node -r tsx/cjs src/lib/email/testing/runTests.ts
```

### Running Specific Test Suites

```typescript
import { EmailTestRunner } from '@/lib/email/testing';

const testRunner = new EmailTestRunner();

// Test only email providers
const providerResults = await testRunner.runProviderTests();

// Test only security features
const securityResults = await testRunner.runSecurityTests();

// Test only audit logging
const auditResults = await testRunner.runAuditTests();
```

### Quick API Testing

```typescript
import { runQuickTests, testProvider } from '@/lib/email/testing';

// Run all tests quickly
await runQuickTests();

// Test specific provider
const success = await testProvider('MICROSOFT_GRAPH');
```

## Test Framework Components

### MockEmailProvider

Simulates real email providers for testing without external dependencies.

```typescript
import { MockEmailProviderFactory } from '@/lib/email/testing';

// Create mock Microsoft Graph provider
const provider = MockEmailProviderFactory.createMicrosoftGraphProvider('test@company.com');

// Configure mock behavior
provider.setMockBehavior({
  shouldError: false,
  responseDelay: 100,
  rateLimitHit: false
});

// Use like a real provider
await provider.initialize();
const messages = await provider.getMessages({ limit: 10 });
```

### EmailTestRunner

Orchestrates comprehensive test execution across all email integration components.

```typescript
import { EmailTestRunner } from '@/lib/email/testing';

const testRunner = new EmailTestRunner({
  accountId: 'test-account-id',
  integrationId: 'test-integration-id',
  cleanupAfter: true
});

const allResults = await testRunner.runAllTests();
const report = testRunner.generateReport(allResults);
console.log(report);
```

### Test Utilities

Helper functions and classes for creating test data and assertions.

```typescript
import { TestAssert, createTestData, MockDataGenerator } from '@/lib/email/testing/testUtils';

// Create test database records
const testData = await createTestData();

// Use assertions in tests
TestAssert.isTrue(result.success, 'Operation should succeed');
TestAssert.arrayLength(messages, 5, 'Should have 5 messages');
TestAssert.contains(message.subject, 'urgent', 'Should contain urgent keyword');

// Generate mock data
const email = MockDataGenerator.randomEmail();
const subject = MockDataGenerator.randomSubject();
const body = MockDataGenerator.randomMessageBody('long');
```

## Test Suites

### Provider Tests

Tests all email provider implementations:

- **Authentication**: OAuth flows and token management
- **Message Retrieval**: Fetching messages with various filters
- **Message Operations**: Reading, marking, deleting messages
- **Attachment Handling**: Downloading and processing attachments
- **Error Handling**: Network errors, rate limits, authentication failures
- **Connection Testing**: Provider connectivity and configuration validation

```typescript
// Example provider test
await testRunner.runTest('Microsoft Graph Provider - Basic Operations', async () => {
  const provider = MockEmailProviderFactory.createMicrosoftGraphProvider('test@company.com');
  
  await provider.initialize();
  const authenticated = await provider.authenticate();
  TestAssert.isTrue(authenticated, 'Authentication should succeed');
  
  const messages = await provider.getMessages({ limit: 5 });
  TestAssert.exists(messages, 'Messages should be retrieved');
  TestAssert.isTrue(messages.length > 0, 'Should have messages');
  
  return { messagesCount: messages.length };
});
```

### Processing Tests

Tests email message processing functionality:

- **Content Parsing**: Subject, body, headers extraction
- **Threading**: Reply chains and conversation grouping
- **Filtering**: Date ranges, sender filters, content filters
- **Attachment Processing**: Security scanning and content extraction
- **Ticket Creation**: Automatic ticket generation from emails

```typescript
// Example processing test
await testRunner.runTest('Message Content Parsing', async () => {
  const provider = MockEmailProviderFactory.createMicrosoftGraphProvider('support@company.com');
  const messages = await provider.getMessages({ limit: 1 });
  const message = messages[0];
  
  TestAssert.exists(message.subject, 'Message should have subject');
  TestAssert.exists(message.from.email, 'Message should have sender');
  TestAssert.isTrue(message.textBody || message.htmlBody, 'Message should have body');
  
  return {
    subject: message.subject,
    hasAttachments: message.attachments.length > 0,
    bodyType: message.htmlBody ? 'html' : 'text'
  };
});
```

### Security Tests

Tests email security and threat detection:

- **Spam Detection**: Keyword-based and pattern-based detection
- **Malware Scanning**: Attachment security validation
- **Phishing Detection**: URL analysis and sender reputation
- **Content Filtering**: Policy enforcement and risk assessment
- **Quarantine Operations**: Isolation and review workflows

```typescript
// Example security test
await testRunner.runTest('Malicious Attachment Detection', async () => {
  const provider = MockEmailProviderFactory.createMicrosoftGraphProvider('support@company.com');
  const messages = await provider.getMessages();
  
  const suspiciousMessage = messages.find(m => 
    m.attachments.some(att => att.filename.endsWith('.exe'))
  );
  
  TestAssert.exists(suspiciousMessage, 'Should find message with suspicious attachment');
  
  const maliciousAttachment = suspiciousMessage!.attachments.find(
    att => att.filename.endsWith('.exe')
  );
  
  const isMalicious = this.detectMaliciousAttachment(maliciousAttachment!);
  TestAssert.isTrue(isMalicious, 'Should detect malicious attachment');
  
  return {
    maliciousDetected: isMalicious,
    attachmentName: maliciousAttachment!.filename,
    riskLevel: 'HIGH'
  };
});
```

### Notification Tests

Tests the email notification system:

- **Template Rendering**: Handlebars template processing
- **Ticket Notifications**: Creation, updates, status changes
- **Security Alerts**: Threat notifications to administrators
- **Auto-Responses**: Automated customer communications
- **Queue Management**: Email delivery and retry logic

```typescript
// Example notification test
await testRunner.runTest('Ticket Creation Notification', async () => {
  const notificationService = new EmailNotificationService();
  
  const result = await notificationService.notifyTicketCreated(
    'customer@example.com',
    {
      ticketNumber: 'TEST-2024-0001',
      ticketSubject: 'Test Issue',
      ticketStatus: 'OPEN',
      ticketPriority: 'MEDIUM',
      accountName: 'Test Account',
      createdAt: new Date(),
      ticketLink: 'https://support.example.com/tickets/TEST-2024-0001'
    }
  );
  
  TestAssert.isTrue(result.success, 'Notification should be sent successfully');
  TestAssert.exists(result.queueId, 'Should have queue ID');
  
  return {
    success: result.success,
    messageId: result.messageId,
    queueId: result.queueId
  };
});
```

### Audit Tests

Tests comprehensive audit logging:

- **Event Logging**: Integration lifecycle events
- **Access Tracking**: User access to email resources
- **Security Logging**: Threat detection and response events
- **Performance Metrics**: Response times and operation tracking
- **Compliance Reporting**: Audit trail generation

```typescript
// Example audit test
await testRunner.runTest('Audit Event Logging', async () => {
  await EmailAuditService.logAuditEvent({
    eventType: 'INTEGRATION_CREATED',
    entityType: 'EmailIntegration',
    entityId: 'test-integration-1',
    action: 'create_integration',
    description: 'Test integration created',
    success: true,
    metadata: { provider: 'MICROSOFT_GRAPH' }
  }, {
    userId: 'test-user-1',
    accountId: 'test-account-1'
  });
  
  const logs = await EmailAuditService.getAuditLogs({
    entityTypes: ['EmailIntegration'],
    limit: 1
  });
  
  TestAssert.isTrue(logs.logs.length > 0, 'Audit log should be created');
  
  return {
    logCreated: true,
    logId: logs.logs[0].id,
    eventType: logs.logs[0].eventType
  };
});
```

## Mock Data

The framework includes comprehensive mock data for testing:

### Sample Messages

- **Standard Support Request**: Regular customer inquiry
- **Urgent Issue**: High-priority support request with attachments
- **Spam Message**: Obvious spam with suspicious links and attachments
- **Newsletter**: Low-priority marketing communication
- **Reply Chain**: Threaded conversation with multiple participants

### Sample Scenarios

- **Rate Limiting**: Simulates API rate limit responses
- **Authentication Errors**: Token expiration and refresh failures
- **Network Issues**: Connection timeouts and service unavailability
- **Malicious Content**: Spam, phishing, and malware samples
- **Large Attachments**: Files exceeding size limits

## Configuration

### Test Environment Setup

```typescript
// Create test configuration
const testConfig = {
  timeout: 30000,
  retries: 2,
  cleanupOnFailure: true,
  verbose: true,
  skipSlowTests: false
};

const testRunner = new EmailTestRunner(testConfig);
```

### Database Setup

The framework automatically creates and cleans up test data:

```typescript
// Manual test data management
const testData = await createTestData();

try {
  // Run tests with test data
  await runTests(testData);
} finally {
  // Always cleanup
  await cleanupTestData(testData);
}
```

### Mock Provider Configuration

```typescript
const provider = new MockEmailProvider({
  provider: 'MICROSOFT_GRAPH',
  accountEmail: 'test@company.com',
  mockData: customMockMessages
});

// Configure behavior
provider.setMockBehavior({
  shouldError: false,
  responseDelay: 100,
  rateLimitHit: false,
  customMessages: additionalTestMessages
});
```

## Performance Testing

### Response Time Measurement

```typescript
import { PerformanceTimer } from '@/lib/email/testing/testUtils';

const { result, duration } = await PerformanceTimer.measure(async () => {
  return await provider.getMessages({ limit: 100 });
});

console.log(`Retrieved ${result.length} messages in ${duration}ms`);
```

### Load Testing

```typescript
// Simulate high load
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(provider.getMessages({ limit: 10 }));
}

const results = await Promise.all(promises);
console.log(`Processed ${results.flat().length} messages concurrently`);
```

## Extending the Framework

### Adding Custom Tests

```typescript
// Add to EmailTestRunner
async runCustomTests(): Promise<TestSuiteResult> {
  this.currentSuite = 'Custom Tests';
  this.testResults = [];
  const startTime = Date.now();

  await this.runTest('Custom Integration Test', async () => {
    // Your custom test logic here
    return { customResult: true };
  });

  return this.createSuiteResult(this.currentSuite, Date.now() - startTime);
}
```

### Custom Mock Providers

```typescript
class CustomMockProvider extends MockEmailProvider {
  async customOperation(): Promise<any> {
    // Custom provider functionality
  }
}
```

### Custom Test Utilities

```typescript
export class CustomTestUtils {
  static async customAssertion(condition: boolean): Promise<void> {
    // Custom assertion logic
  }
  
  static generateCustomMockData(): any[] {
    // Custom mock data generation
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure DATABASE_URL is set correctly
   - Run `npx prisma generate` before tests

2. **Mock Data Conflicts**
   - Clear test data: `await cleanupTestData(testData)`
   - Check for unique constraint violations

3. **Timeout Issues**
   - Increase test timeout in configuration
   - Check for infinite loops in test logic

4. **Memory Issues**
   - Cleanup mock providers after tests
   - Reduce mock data size for large test suites

### Debug Mode

```typescript
const testRunner = new EmailTestRunner({
  verbose: true,
  cleanupOnFailure: false // Keep data for debugging
});
```

### Logging

```typescript
// Enable detailed logging
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';

// Run tests with logging
await testRunner.runAllTests();
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Email Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Setup database
      run: npx prisma migrate dev
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        
    - name: Run email integration tests
      run: npx tsx src/lib/email/testing/runTests.ts
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:email": "tsx src/lib/email/testing/runTests.ts",
    "test:email:providers": "tsx -e \"import('./src/lib/email/testing').then(m => m.testProvider('MICROSOFT_GRAPH'))\"",
    "test:email:security": "tsx -e \"import('./src/lib/email/testing').then(m => m.testSecurityFeatures())\"",
    "test:email:quick": "tsx -e \"import('./src/lib/email/testing').then(m => m.runQuickTests())\""
  }
}
```

## Best Practices

### Test Organization

1. **Atomic Tests**: Each test should be independent and focused
2. **Descriptive Names**: Use clear, descriptive test names
3. **Setup/Teardown**: Always clean up test data
4. **Error Messages**: Provide helpful error messages in assertions
5. **Mock Data**: Use realistic but safe mock data

### Performance

1. **Parallel Execution**: Run independent tests concurrently
2. **Selective Testing**: Skip slow tests when appropriate
3. **Resource Cleanup**: Always cleanup resources after tests
4. **Caching**: Cache expensive operations when possible

### Maintainability

1. **DRY Principle**: Extract common test logic
2. **Configuration**: Use configuration for test parameters
3. **Documentation**: Document complex test scenarios
4. **Version Control**: Track test changes with meaningful commits

This testing framework provides comprehensive coverage of the email integration system, ensuring reliability, security, and performance across all components.