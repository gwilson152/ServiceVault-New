import { prisma } from '@/lib/prisma';
import { MockEmailProvider } from './MockEmailProvider';

/**
 * Test utilities for email integration testing
 */

/**
 * Create test database records
 */
export async function createTestData() {
  // Create test account
  const testAccount = await prisma.account.create({
    data: {
      name: 'Test Account',
      accountType: 'ORGANIZATION',
      domains: 'testcompany.com,example.org',
      companyName: 'Test Company Inc.',
      customFields: {
        testMode: true,
        createdForTesting: new Date().toISOString()
      }
    }
  });

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'testuser@testcompany.com',
      preferences: {
        testMode: true
      }
    }
  });

  // Create account membership
  const testMembership = await prisma.accountMembership.create({
    data: {
      userId: testUser.id,
      accountId: testAccount.id
    }
  });

  // Create test email integration
  const testIntegration = await prisma.emailIntegration.create({
    data: {
      accountId: testAccount.id,
      provider: 'MICROSOFT_GRAPH',
      providerConfig: {
        clientId: 'test-client-id',
        tenantId: 'test-tenant-id',
        testMode: true
      },
      isActive: true,
      lastSyncAt: new Date(),
      syncInterval: 300
    }
  });

  return {
    account: testAccount,
    user: testUser,
    membership: testMembership,
    integration: testIntegration
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(testData: {
  account: { id: string };
  user: { id: string };
  integration: { id: string };
}) {
  // Delete in reverse order due to foreign key constraints
  await prisma.emailIntegration.delete({
    where: { id: testData.integration.id }
  });

  await prisma.accountMembership.deleteMany({
    where: { accountId: testData.account.id }
  });

  await prisma.account.delete({
    where: { id: testData.account.id }
  });

  await prisma.user.delete({
    where: { id: testData.user.id }
  });
}

/**
 * Create mock email messages for testing
 */
export function createMockMessages() {
  const baseTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

  return [
    {
      id: 'test_msg_1',
      messageId: '<test1@customer.com>',
      from: { email: 'customer@testcompany.com', name: 'Test Customer' },
      to: [{ email: 'support@testcompany.com', name: 'Support Team' }],
      subject: 'Test Support Request',
      textBody: 'This is a test support request for automated testing.',
      htmlBody: '<p>This is a test support request for automated testing.</p>',
      receivedAt: new Date(baseTime).toISOString(),
      isRead: false,
      priority: 'normal' as const,
      folder: 'inbox'
    },
    {
      id: 'test_msg_2',
      messageId: '<test2@urgent.com>',
      from: { email: 'urgent@testcompany.com', name: 'Urgent Customer' },
      to: [{ email: 'support@testcompany.com', name: 'Support Team' }],
      subject: '[URGENT] Test Critical Issue',
      textBody: 'This is a test urgent support request.',
      htmlBody: '<p><strong>This is a test urgent support request.</strong></p>',
      receivedAt: new Date(baseTime + 3600000).toISOString(), // 1 hour later
      isRead: false,
      priority: 'high' as const,
      folder: 'inbox',
      attachments: [
        {
          id: 'test_att_1',
          filename: 'test_log.txt',
          contentType: 'text/plain',
          size: 512
        }
      ]
    },
    {
      id: 'test_msg_3',
      messageId: '<test3@spam.com>',
      from: { email: 'spam@malicious.com', name: 'Spam Sender' },
      to: [{ email: 'support@testcompany.com', name: 'Support Team' }],
      subject: 'Test Spam Message - You Won $100,000!',
      textBody: 'This is a test spam message for security testing. Click here to claim!',
      htmlBody: '<p>This is a test spam message for security testing. <a href="http://malicious.com">Click here</a> to claim!</p>',
      receivedAt: new Date(baseTime + 7200000).toISOString(), // 2 hours later
      isRead: false,
      priority: 'normal' as const,
      folder: 'inbox',
      attachments: [
        {
          id: 'test_att_2',
          filename: 'malicious_test.exe',
          contentType: 'application/octet-stream',
          size: 1024
        }
      ]
    }
  ];
}

/**
 * Assert test conditions
 */
export class TestAssert {
  static isTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static isFalse(condition: boolean, message: string): void {
    if (condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static equals(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message || 'Values not equal'}. Expected: ${expected}, Actual: ${actual}`);
    }
  }

  static notEquals(actual: any, expected: any, message?: string): void {
    if (actual === expected) {
      throw new Error(`Assertion failed: ${message || 'Values should not be equal'}. Both values: ${actual}`);
    }
  }

  static exists(value: any, message?: string): void {
    if (value == null) {
      throw new Error(`Assertion failed: ${message || 'Value should exist'}`);
    }
  }

  static doesNotExist(value: any, message?: string): void {
    if (value != null) {
      throw new Error(`Assertion failed: ${message || 'Value should not exist'}. Value: ${value}`);
    }
  }

  static arrayLength(array: any[], expectedLength: number, message?: string): void {
    if (!Array.isArray(array)) {
      throw new Error(`Assertion failed: ${message || 'Value is not an array'}`);
    }
    if (array.length !== expectedLength) {
      throw new Error(`Assertion failed: ${message || 'Array length mismatch'}. Expected: ${expectedLength}, Actual: ${array.length}`);
    }
  }

  static contains(haystack: string | any[], needle: any, message?: string): void {
    const contains = Array.isArray(haystack) ? 
      haystack.includes(needle) : 
      haystack.includes(needle as string);

    if (!contains) {
      throw new Error(`Assertion failed: ${message || 'Item not found in collection'}`);
    }
  }

  static async throws(fn: () => Promise<any>, expectedError?: string | RegExp, message?: string): Promise<void> {
    try {
      await fn();
      throw new Error(`Assertion failed: ${message || 'Function should have thrown an error'}`);
    } catch (error) {
      if (expectedError) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (typeof expectedError === 'string') {
          if (!errorMessage.includes(expectedError)) {
            throw new Error(`Assertion failed: ${message || 'Wrong error message'}. Expected: ${expectedError}, Actual: ${errorMessage}`);
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorMessage)) {
            throw new Error(`Assertion failed: ${message || 'Error message does not match pattern'}. Pattern: ${expectedError}, Actual: ${errorMessage}`);
          }
        }
      }
    }
  }

  static async doesNotThrow(fn: () => Promise<any>, message?: string): Promise<void> {
    try {
      await fn();
    } catch (error) {
      throw new Error(`Assertion failed: ${message || 'Function should not have thrown an error'}. Error: ${error}`);
    }
  }
}

/**
 * Test performance measurement
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  static async measure<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const timer = new PerformanceTimer();
    timer.start();
    const result = await fn();
    const duration = timer.stop();
    return { result, duration };
  }
}

/**
 * Mock data generators
 */
export class MockDataGenerator {
  static randomEmail(): string {
    const domains = ['test.com', 'example.org', 'mock.net'];
    const names = ['user', 'customer', 'client', 'contact'];
    const numbers = Math.floor(Math.random() * 1000);
    
    return `${names[Math.floor(Math.random() * names.length)]}${numbers}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  static randomSubject(): string {
    const prefixes = ['', '[URGENT] ', '[INFO] ', 'Re: '];
    const subjects = [
      'Support Request',
      'Account Issue',
      'Technical Problem',
      'Feature Request',
      'General Inquiry'
    ];
    
    return prefixes[Math.floor(Math.random() * prefixes.length)] + 
           subjects[Math.floor(Math.random() * subjects.length)];
  }

  static randomMessageBody(length: 'short' | 'medium' | 'long' = 'medium'): string {
    const sentences = [
      'This is a test message for automated testing.',
      'We are experiencing some issues with our system.',
      'Could you please help us resolve this matter?',
      'Thank you for your prompt attention to this request.',
      'We look forward to hearing from you soon.',
      'Please let us know if you need any additional information.',
      'This is an important matter that requires immediate attention.',
      'We have been working on this issue for several hours.',
      'The problem seems to be related to our recent updates.',
      'We would appreciate your assistance in resolving this.'
    ];

    let count: number;
    switch (length) {
      case 'short': count = 1 + Math.floor(Math.random() * 2); break;
      case 'long': count = 5 + Math.floor(Math.random() * 5); break;
      default: count = 2 + Math.floor(Math.random() * 3); break;
    }

    const selectedSentences: string[] = [];
    for (let i = 0; i < count; i++) {
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      if (!selectedSentences.includes(sentence)) {
        selectedSentences.push(sentence);
      }
    }

    return selectedSentences.join(' ');
  }
}

/**
 * Test configuration
 */
export interface TestConfig {
  timeout?: number;
  retries?: number;
  cleanupOnFailure?: boolean;
  verbose?: boolean;
  skipSlowTests?: boolean;
}

export const defaultTestConfig: TestConfig = {
  timeout: 30000,
  retries: 0,
  cleanupOnFailure: true,
  verbose: false,
  skipSlowTests: false
};