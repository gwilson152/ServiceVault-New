import { EmailProvider, EmailMessage, EmailAttachment } from '../types';

/**
 * Mock email provider for testing email integration functionality
 */
export class MockEmailProvider implements EmailProvider {
  private mockMessages: MockEmailMessage[] = [];
  private mockErrors: boolean = false;
  private responseDelay: number = 0;
  private rateLimitHit: boolean = false;
  
  constructor(
    private config: {
      provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'GENERIC_IMAP' | 'GENERIC_POP3';
      name: string;
      mockData?: MockEmailMessage[];
    }
  ) {
    this.mockMessages = config.mockData || this.generateDefaultMockMessages();
  }

  /**
   * Configure mock behavior for testing
   */
  setMockBehavior(behavior: {
    shouldError?: boolean;
    responseDelay?: number;
    rateLimitHit?: boolean;
    customMessages?: MockEmailMessage[];
  }) {
    if (behavior.shouldError !== undefined) this.mockErrors = behavior.shouldError;
    if (behavior.responseDelay !== undefined) this.responseDelay = behavior.responseDelay;
    if (behavior.rateLimitHit !== undefined) this.rateLimitHit = behavior.rateLimitHit;
    if (behavior.customMessages) this.mockMessages = behavior.customMessages;
  }

  async initialize(): Promise<void> {
    await this.delay();
    
    if (this.mockErrors) {
      throw new Error('Mock initialization error');
    }
  }

  async authenticate(): Promise<boolean> {
    await this.delay();
    
    if (this.mockErrors) {
      return false;
    }
    
    return true;
  }

  async refreshToken(): Promise<boolean> {
    await this.delay();
    
    if (this.mockErrors) {
      throw new Error('Mock token refresh error');
    }
    
    return true;
  }

  async getMessages(options: {
    since?: Date;
    limit?: number;
    folder?: string;
  } = {}): Promise<EmailMessage[]> {
    await this.delay();
    
    if (this.rateLimitHit) {
      throw new Error('Rate limit exceeded');
    }
    
    if (this.mockErrors) {
      throw new Error('Mock get messages error');
    }

    let messages = [...this.mockMessages];

    // Apply filters
    if (options.since) {
      messages = messages.filter(msg => new Date(msg.receivedAt) >= options.since!);
    }

    if (options.limit) {
      messages = messages.slice(0, options.limit);
    }

    // Convert to EmailMessage format
    return messages.map(this.convertToEmailMessage);
  }

  async getMessage(messageId: string): Promise<EmailMessage | null> {
    await this.delay();
    
    if (this.mockErrors) {
      throw new Error('Mock get message error');
    }

    const mockMessage = this.mockMessages.find(msg => msg.id === messageId);
    return mockMessage ? this.convertToEmailMessage(mockMessage) : null;
  }

  async markAsRead(messageId: string): Promise<boolean> {
    await this.delay();
    
    if (this.mockErrors) {
      return false;
    }

    const message = this.mockMessages.find(msg => msg.id === messageId);
    if (message) {
      message.isRead = true;
      return true;
    }
    
    return false;
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    await this.delay();
    
    if (this.mockErrors) {
      return false;
    }

    const index = this.mockMessages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.mockMessages.splice(index, 1);
      return true;
    }
    
    return false;
  }

  async sendMessage(message: {
    to: string[];
    subject: string;
    body: string;
    replyTo?: string;
  }): Promise<string> {
    await this.delay();
    
    if (this.mockErrors) {
      throw new Error('Mock send message error');
    }

    // Generate mock message ID
    const messageId = `mock_sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return messageId;
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer | null> {
    await this.delay();
    
    if (this.mockErrors) {
      throw new Error('Mock get attachment error');
    }

    const message = this.mockMessages.find(msg => msg.id === messageId);
    if (!message) return null;

    const attachment = message.attachments?.find(att => att.id === attachmentId);
    if (!attachment) return null;

    // Return mock binary data
    return Buffer.from(`Mock attachment content for ${attachment.filename}`);
  }

  async testConnection(): Promise<boolean> {
    await this.delay();
    return !this.mockErrors;
  }

  private convertToEmailMessage(mockMessage: MockEmailMessage): EmailMessage {
    return {
      id: mockMessage.id,
      messageId: mockMessage.messageId || `<${mockMessage.id}@example.com>`,
      threadId: mockMessage.threadId,
      inReplyTo: mockMessage.inReplyTo,
      from: {
        email: mockMessage.from.email,
        name: mockMessage.from.name
      },
      to: mockMessage.to,
      cc: mockMessage.cc || [],
      bcc: mockMessage.bcc || [],
      subject: mockMessage.subject,
      textBody: mockMessage.textBody,
      htmlBody: mockMessage.htmlBody,
      headers: mockMessage.headers || {},
      attachments: (mockMessage.attachments || []).map(att => ({
        id: att.id,
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId
      })),
      receivedAt: new Date(mockMessage.receivedAt),
      isRead: mockMessage.isRead || false,
      priority: mockMessage.priority || 'normal',
      folder: mockMessage.folder || 'inbox'
    };
  }

  private delay(): Promise<void> {
    if (this.responseDelay === 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, this.responseDelay));
  }

  private generateDefaultMockMessages(): MockEmailMessage[] {
    const baseTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    return [
      {
        id: 'mock_msg_1',
        messageId: '<msg1@customer.com>',
        from: { email: 'customer@example.com', name: 'John Customer' },
        to: [{ email: 'support@example.com', name: 'Support' }],
        subject: 'Unable to access my account',
        textBody: 'Hi, I\'m having trouble accessing my account. Can you please help?',
        htmlBody: '<p>Hi, I\'m having trouble accessing my account. Can you please help?</p>',
        receivedAt: new Date(baseTime).toISOString(),
        isRead: false,
        priority: 'normal',
        folder: 'inbox'
      },
      {
        id: 'mock_msg_2',
        messageId: '<msg2@customer.com>',
        threadId: 'thread_1',
        from: { email: 'urgent@example.com', name: 'Urgent Customer' },
        to: [{ email: 'support@example.com', name: 'Support' }],
        subject: '[URGENT] System down - need immediate help',
        textBody: 'Our production system is down and we need immediate assistance!',
        htmlBody: '<p><strong>Our production system is down and we need immediate assistance!</strong></p>',
        receivedAt: new Date(baseTime + 3600000).toISOString(), // 1 hour later
        isRead: false,
        priority: 'high',
        folder: 'inbox',
        attachments: [
          {
            id: 'att_1',
            filename: 'error_log.txt',
            contentType: 'text/plain',
            size: 1024
          }
        ]
      },
      {
        id: 'mock_msg_3',
        messageId: '<msg3@spam.com>',
        from: { email: 'spam@suspicious.com', name: 'Suspicious Sender' },
        to: [{ email: 'support@example.com', name: 'Support' }],
        subject: 'You won $1,000,000! Click here now!',
        textBody: 'Congratulations! You have won $1,000,000. Click the link to claim your prize.',
        htmlBody: '<p>Congratulations! You have won $1,000,000. <a href="http://suspicious.com/claim">Click here</a> to claim your prize.</p>',
        receivedAt: new Date(baseTime + 7200000).toISOString(), // 2 hours later
        isRead: false,
        priority: 'normal',
        folder: 'inbox',
        attachments: [
          {
            id: 'att_2',
            filename: 'malicious.exe',
            contentType: 'application/octet-stream',
            size: 2048
          }
        ]
      },
      {
        id: 'mock_msg_4',
        messageId: '<msg4@customer.com>',
        threadId: 'thread_1',
        inReplyTo: '<msg2@customer.com>',
        from: { email: 'support@example.com', name: 'Support Agent' },
        to: [{ email: 'urgent@example.com', name: 'Urgent Customer' }],
        subject: 'Re: [URGENT] System down - need immediate help',
        textBody: 'We are looking into your issue. Our team has been notified.',
        htmlBody: '<p>We are looking into your issue. Our team has been notified.</p>',
        receivedAt: new Date(baseTime + 10800000).toISOString(), // 3 hours later
        isRead: true,
        priority: 'high',
        folder: 'sent'
      },
      {
        id: 'mock_msg_5',
        messageId: '<msg5@newsletter.com>',
        from: { email: 'newsletter@company.com', name: 'Company Newsletter' },
        to: [{ email: 'support@example.com', name: 'Subscriber' }],
        subject: 'Monthly Newsletter - New Features',
        textBody: 'Check out our new features and updates for this month.',
        htmlBody: '<h1>Monthly Newsletter</h1><p>Check out our new features and updates for this month.</p>',
        receivedAt: new Date(baseTime + 14400000).toISOString(), // 4 hours later
        isRead: false,
        priority: 'low',
        folder: 'inbox'
      }
    ];
  }

  /**
   * Test helper methods
   */
  getMockMessages(): MockEmailMessage[] {
    return [...this.mockMessages];
  }

  addMockMessage(message: Partial<MockEmailMessage>) {
    const fullMessage: MockEmailMessage = {
      id: `mock_msg_${Date.now()}`,
      messageId: `<${Date.now()}@example.com>`,
      from: { email: 'test@example.com', name: 'Test Sender' },
      to: [{ email: 'support@example.com', name: 'Recipient' }],
      subject: 'Test Message',
      textBody: 'Test message body',
      receivedAt: new Date().toISOString(),
      isRead: false,
      priority: 'normal',
      folder: 'inbox',
      ...message
    };

    this.mockMessages.push(fullMessage);
    return fullMessage.id;
  }

  clearMockMessages() {
    this.mockMessages = [];
  }

  simulateNewMessage(message: Partial<MockEmailMessage>): string {
    return this.addMockMessage({
      receivedAt: new Date().toISOString(),
      ...message
    });
  }
}

/**
 * Mock message interface
 */
interface MockEmailMessage {
  id: string;
  messageId?: string;
  threadId?: string;
  inReplyTo?: string;
  from: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
  }>;
  receivedAt: string;
  isRead?: boolean;
  priority?: 'low' | 'normal' | 'high';
  folder?: string;
}

/**
 * Mock provider factory
 */
export class MockEmailProviderFactory {
  static createProvider(
    provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'GENERIC_IMAP' | 'GENERIC_POP3',
    name: string,
    options?: {
      mockMessages?: MockEmailMessage[];
      shouldError?: boolean;
      responseDelay?: number;
    }
  ): MockEmailProvider {
    const mockProvider = new MockEmailProvider({
      provider,
      name,
      mockData: options?.mockMessages
    });

    if (options?.shouldError || options?.responseDelay) {
      mockProvider.setMockBehavior({
        shouldError: options.shouldError,
        responseDelay: options.responseDelay
      });
    }

    return mockProvider;
  }

  static createMicrosoftGraphProvider(name: string = 'Test Microsoft Graph'): MockEmailProvider {
    return this.createProvider('MICROSOFT_GRAPH', name);
  }

  static createGmailProvider(name: string = 'Test Gmail'): MockEmailProvider {
    return this.createProvider('GMAIL', name);
  }

  static createIMAPProvider(name: string = 'Test IMAP'): MockEmailProvider {
    return this.createProvider('GENERIC_IMAP', name);
  }

  static createPOP3Provider(name: string = 'Test POP3'): MockEmailProvider {
    return this.createProvider('GENERIC_POP3', name);
  }
}