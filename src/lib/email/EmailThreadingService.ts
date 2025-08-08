import { prisma } from '@/lib/prisma';
import type { EmailMessage, Ticket } from '@prisma/client';
import type { EmailMessageData } from './providers/EmailProvider';

/**
 * Email thread structure
 */
export interface EmailThread {
  id: string;
  rootMessageId: string;
  subject: string;
  participantEmails: string[];
  messageCount: number;
  ticketId?: string;
  createdAt: Date;
  lastMessageAt: Date;
  messages: EmailThreadMessage[];
}

/**
 * Email thread message
 */
export interface EmailThreadMessage {
  id: string;
  messageId: string;
  threadId: string;
  parentMessageId?: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  sentAt: Date;
  isRead: boolean;
  depth: number; // Thread nesting depth
  children: EmailThreadMessage[];
}

/**
 * Threading configuration
 */
export interface ThreadingConfig {
  // RFC compliance settings
  useMessageIdHeaders: boolean;
  useInReplyToHeaders: boolean;
  useReferencesHeaders: boolean;
  useSubjectMatching: boolean;
  
  // Subject matching rules
  subjectMatchingEnabled: boolean;
  subjectNormalizationRules: {
    removeReplyPrefixes: boolean;
    removeFwdPrefixes: boolean;
    removeExtraSpaces: boolean;
    caseInsensitive: boolean;
  };
  
  // Threading limits
  maxThreadDepth: number;
  maxThreadAge: number; // Days
  maxMessagesPerThread: number;
  
  // Auto-merge settings
  autoMergeRelatedThreads: boolean;
  mergeTimeWindow: number; // Hours
  
  // Performance settings
  enableThreadCaching: boolean;
  cacheExpiryTime: number; // Minutes
}

/**
 * Default threading configuration
 */
const DEFAULT_THREADING_CONFIG: ThreadingConfig = {
  useMessageIdHeaders: true,
  useInReplyToHeaders: true,
  useReferencesHeaders: true,
  useSubjectMatching: true,
  
  subjectMatchingEnabled: true,
  subjectNormalizationRules: {
    removeReplyPrefixes: true,
    removeFwdPrefixes: true,
    removeExtraSpaces: true,
    caseInsensitive: true
  },
  
  maxThreadDepth: 10,
  maxThreadAge: 365, // 1 year
  maxMessagesPerThread: 100,
  
  autoMergeRelatedThreads: true,
  mergeTimeWindow: 24, // 24 hours
  
  enableThreadCaching: true,
  cacheExpiryTime: 30 // 30 minutes
};

/**
 * RFC-compliant email threading service
 * Implements email threading according to RFC 2822 and common email client practices
 */
export class EmailThreadingService {
  private config: ThreadingConfig;
  private threadCache = new Map<string, EmailThread>();
  private cacheExpiry = new Map<string, number>();

  constructor(config?: Partial<ThreadingConfig>) {
    this.config = { ...DEFAULT_THREADING_CONFIG, ...config };
  }

  /**
   * Add email message to thread or create new thread
   */
  async threadMessage(email: EmailMessageData, emailMessage?: EmailMessage): Promise<{
    thread: EmailThread;
    isNewThread: boolean;
    parentMessage?: EmailThreadMessage;
  }> {
    try {
      // Step 1: Try to find existing thread using RFC headers
      let existingThread = await this.findThreadByHeaders(email);
      
      // Step 2: If no thread found by headers, try subject matching
      if (!existingThread && this.config.useSubjectMatching) {
        existingThread = await this.findThreadBySubject(email);
      }

      if (existingThread) {
        // Add message to existing thread
        const parentMessage = await this.findParentMessage(email, existingThread);
        const threadMessage = await this.addMessageToThread(email, existingThread, parentMessage, emailMessage);
        
        // Update thread metadata
        await this.updateThreadMetadata(existingThread.id, email);
        
        // Reload updated thread
        const updatedThread = await this.getThread(existingThread.id);
        
        return {
          thread: updatedThread!,
          isNewThread: false,
          parentMessage
        };
      } else {
        // Create new thread
        const newThread = await this.createNewThread(email, emailMessage);
        
        return {
          thread: newThread,
          isNewThread: true
        };
      }

    } catch (error) {
      console.error('Error in email threading:', error);
      
      // Fallback: create new thread
      const fallbackThread = await this.createNewThread(email, emailMessage);
      return {
        thread: fallbackThread,
        isNewThread: true
      };
    }
  }

  /**
   * Find thread by RFC message headers
   */
  private async findThreadByHeaders(email: EmailMessageData): Promise<EmailThread | null> {
    const queries: Promise<EmailMessage[]>[] = [];

    // Search by In-Reply-To header
    if (this.config.useInReplyToHeaders && email.inReplyTo) {
      queries.push(
        prisma.emailMessage.findMany({
          where: { messageId: email.inReplyTo },
          take: 1
        })
      );
    }

    // Search by References header
    if (this.config.useReferencesHeaders && email.headers?.['references']) {
      const references = this.parseReferencesHeader(email.headers['references']);
      if (references.length > 0) {
        queries.push(
          prisma.emailMessage.findMany({
            where: {
              messageId: { in: references }
            },
            take: 1
          })
        );
      }
    }

    // Search by thread ID (for providers that support it)
    if (email.threadId) {
      queries.push(
        prisma.emailMessage.findMany({
          where: { threadId: email.threadId },
          take: 1
        })
      );
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);
    
    for (const result of results) {
      if (result.length > 0) {
        const relatedMessage = result[0];
        if (relatedMessage.threadId) {
          return await this.getThread(relatedMessage.threadId);
        }
      }
    }

    return null;
  }

  /**
   * Find thread by subject matching
   */
  private async findThreadBySubject(email: EmailMessageData): Promise<EmailThread | null> {
    if (!this.config.subjectMatchingEnabled) {
      return null;
    }

    const normalizedSubject = this.normalizeSubject(email.subject);
    
    if (!normalizedSubject) {
      return null;
    }

    // Look for messages with similar subject within time window
    const timeWindow = new Date(Date.now() - (this.config.mergeTimeWindow * 60 * 60 * 1000));
    
    const similarMessages = await prisma.emailMessage.findMany({
      where: {
        subject: {
          contains: normalizedSubject,
          mode: this.config.subjectNormalizationRules.caseInsensitive ? 'insensitive' : 'default'
        },
        createdAt: {
          gte: timeWindow
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Check for exact normalized subject match
    for (const message of similarMessages) {
      const messageNormalizedSubject = this.normalizeSubject(message.subject);
      
      if (messageNormalizedSubject === normalizedSubject && message.threadId) {
        return await this.getThread(message.threadId);
      }
    }

    return null;
  }

  /**
   * Create new email thread
   */
  private async createNewThread(email: EmailMessageData, emailMessage?: EmailMessage): Promise<EmailThread> {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store thread message
    const threadMessage = await prisma.emailMessage.upsert({
      where: {
        messageId: email.messageId
      },
      create: {
        integrationId: emailMessage?.integrationId || 'unknown',
        messageId: email.messageId,
        threadId: threadId,
        inReplyTo: email.inReplyTo,
        ticketId: emailMessage?.ticketId,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        toEmail: email.toEmail,
        toName: email.toName,
        ccEmails: email.ccEmails,
        bccEmails: email.bccEmails,
        subject: email.subject,
        textBody: email.textBody,
        htmlBody: email.htmlBody,
        headers: email.headers || {},
        status: 'PROCESSED',
        priority: email.priority || 5,
        processedAt: new Date()
      },
      update: {
        threadId: threadId,
        processedAt: new Date()
      }
    });

    return await this.buildThreadStructure(threadId);
  }

  /**
   * Add message to existing thread
   */
  private async addMessageToThread(
    email: EmailMessageData, 
    thread: EmailThread, 
    parentMessage?: EmailThreadMessage,
    emailMessage?: EmailMessage
  ): Promise<EmailThreadMessage> {
    
    const threadMessage = await prisma.emailMessage.upsert({
      where: {
        messageId: email.messageId
      },
      create: {
        integrationId: emailMessage?.integrationId || 'unknown',
        messageId: email.messageId,
        threadId: thread.id,
        inReplyTo: email.inReplyTo || parentMessage?.messageId,
        ticketId: emailMessage?.ticketId || thread.ticketId,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        toEmail: email.toEmail,
        toName: email.toName,
        ccEmails: email.ccEmails,
        bccEmails: email.bccEmails,
        subject: email.subject,
        textBody: email.textBody,
        htmlBody: email.htmlBody,
        headers: email.headers || {},
        status: 'PROCESSED',
        priority: email.priority || 5,
        processedAt: new Date()
      },
      update: {
        threadId: thread.id,
        processedAt: new Date()
      }
    });

    return this.convertToThreadMessage(threadMessage, 0);
  }

  /**
   * Find parent message in thread
   */
  private async findParentMessage(email: EmailMessageData, thread: EmailThread): Promise<EmailThreadMessage | undefined> {
    // Look for In-Reply-To match first
    if (email.inReplyTo) {
      const parent = thread.messages.find(msg => msg.messageId === email.inReplyTo);
      if (parent) {
        return parent;
      }
    }

    // Look for References header matches
    if (email.headers?.['references']) {
      const references = this.parseReferencesHeader(email.headers['references']);
      
      for (let i = references.length - 1; i >= 0; i--) {
        const parent = thread.messages.find(msg => msg.messageId === references[i]);
        if (parent) {
          return parent;
        }
      }
    }

    // Default to most recent message if no specific parent found
    if (thread.messages.length > 0) {
      return thread.messages[thread.messages.length - 1];
    }

    return undefined;
  }

  /**
   * Update thread metadata
   */
  private async updateThreadMetadata(threadId: string, email: EmailMessageData): Promise<void> {
    // Update thread statistics - this could be stored in a separate table if needed
    // For now, we'll just ensure the thread is properly maintained
    
    const threadMessages = await prisma.emailMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (threadMessages.length > 0) {
      // Thread is implicitly updated by the new message
      // Could add explicit thread metadata table here if needed
    }
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<EmailThread | null> {
    // Check cache first
    if (this.config.enableThreadCaching) {
      const cached = this.threadCache.get(threadId);
      const expiry = this.cacheExpiry.get(threadId);
      
      if (cached && expiry && expiry > Date.now()) {
        return cached;
      }
    }

    // Build thread from database
    const thread = await this.buildThreadStructure(threadId);
    
    if (thread && this.config.enableThreadCaching) {
      this.threadCache.set(threadId, thread);
      this.cacheExpiry.set(threadId, Date.now() + (this.config.cacheExpiryTime * 60 * 1000));
    }

    return thread;
  }

  /**
   * Build thread structure from messages
   */
  private async buildThreadStructure(threadId: string): Promise<EmailThread> {
    const messages = await prisma.emailMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' }
    });

    if (messages.length === 0) {
      throw new Error(`No messages found for thread ${threadId}`);
    }

    // Build hierarchical message structure
    const messageMap = new Map<string, EmailThreadMessage>();
    const rootMessages: EmailThreadMessage[] = [];

    // First pass: create all message objects
    for (const message of messages) {
      const threadMessage = this.convertToThreadMessage(message, 0);
      messageMap.set(message.messageId, threadMessage);
    }

    // Second pass: build parent-child relationships
    for (const message of messages) {
      const threadMessage = messageMap.get(message.messageId)!;
      
      if (message.inReplyTo) {
        const parent = messageMap.get(message.inReplyTo);
        if (parent) {
          parent.children.push(threadMessage);
          threadMessage.depth = parent.depth + 1;
        } else {
          rootMessages.push(threadMessage);
        }
      } else {
        rootMessages.push(threadMessage);
      }
    }

    // Calculate thread metadata
    const rootMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const participantEmails = [...new Set(messages.flatMap(m => [m.fromEmail, m.toEmail].filter(Boolean)))];

    const allMessages = Array.from(messageMap.values());

    return {
      id: threadId,
      rootMessageId: rootMessage.messageId,
      subject: this.normalizeSubject(rootMessage.subject) || rootMessage.subject,
      participantEmails,
      messageCount: messages.length,
      ticketId: rootMessage.ticketId || undefined,
      createdAt: rootMessage.createdAt,
      lastMessageAt: lastMessage.createdAt,
      messages: allMessages
    };
  }

  /**
   * Convert EmailMessage to EmailThreadMessage
   */
  private convertToThreadMessage(message: EmailMessage, depth: number): EmailThreadMessage {
    return {
      id: message.id,
      messageId: message.messageId,
      threadId: message.threadId || '',
      parentMessageId: message.inReplyTo || undefined,
      subject: message.subject,
      fromEmail: message.fromEmail,
      fromName: message.fromName || undefined,
      toEmail: message.toEmail,
      sentAt: message.createdAt,
      isRead: message.status === 'PROCESSED',
      depth,
      children: []
    };
  }

  /**
   * Normalize email subject for matching
   */
  private normalizeSubject(subject: string): string {
    if (!subject) return '';

    let normalized = subject;

    if (this.config.subjectNormalizationRules.removeReplyPrefixes) {
      // Remove Re:, RE:, etc.
      normalized = normalized.replace(/^(re:\s*)+/gi, '');
    }

    if (this.config.subjectNormalizationRules.removeFwdPrefixes) {
      // Remove Fwd:, FW:, etc.
      normalized = normalized.replace(/^(fwd?:\s*)+/gi, '');
    }

    if (this.config.subjectNormalizationRules.removeExtraSpaces) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    if (this.config.subjectNormalizationRules.caseInsensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Parse References header
   */
  private parseReferencesHeader(references: string): string[] {
    if (!references) return [];

    // Extract message IDs from References header
    // Format: <msg1@domain.com> <msg2@domain.com> ...
    const messageIds = references.match(/<[^>]+>/g);
    
    if (!messageIds) return [];

    return messageIds.map(id => id.slice(1, -1)); // Remove < >
  }

  /**
   * Get thread by ticket ID
   */
  async getThreadByTicketId(ticketId: string): Promise<EmailThread | null> {
    const message = await prisma.emailMessage.findFirst({
      where: { ticketId },
      orderBy: { createdAt: 'asc' }
    });

    if (!message || !message.threadId) {
      return null;
    }

    return await this.getThread(message.threadId);
  }

  /**
   * Merge threads
   */
  async mergeThreads(sourceThreadId: string, targetThreadId: string): Promise<EmailThread> {
    await prisma.emailMessage.updateMany({
      where: { threadId: sourceThreadId },
      data: { threadId: targetThreadId }
    });

    // Clear cache for both threads
    this.threadCache.delete(sourceThreadId);
    this.threadCache.delete(targetThreadId);

    return await this.buildThreadStructure(targetThreadId);
  }

  /**
   * Get thread statistics
   */
  async getThreadStats(): Promise<{
    totalThreads: number;
    averageMessagesPerThread: number;
    longestThread: number;
    oldestActiveThread: Date | null;
    cacheHitRate: number;
  }> {
    const stats = await prisma.emailMessage.groupBy({
      by: ['threadId'],
      _count: {
        threadId: true
      },
      where: {
        threadId: { not: null }
      }
    });

    const totalThreads = stats.length;
    const totalMessages = stats.reduce((sum, stat) => sum + stat._count.threadId, 0);
    const averageMessagesPerThread = totalThreads > 0 ? totalMessages / totalThreads : 0;
    const longestThread = Math.max(...stats.map(stat => stat._count.threadId), 0);

    // Get oldest active thread
    const oldestThread = await prisma.emailMessage.findFirst({
      where: { threadId: { not: null } },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate cache hit rate (if applicable)
    const cacheSize = this.threadCache.size;
    const maxCacheSize = 1000; // Assume max cache size
    const cacheHitRate = cacheSize / Math.max(maxCacheSize, 1);

    return {
      totalThreads,
      averageMessagesPerThread,
      longestThread,
      oldestActiveThread: oldestThread?.createdAt || null,
      cacheHitRate
    };
  }

  /**
   * Clear thread cache
   */
  clearCache(): void {
    this.threadCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ThreadingConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Get current configuration
   */
  getConfig(): ThreadingConfig {
    return { ...this.config };
  }
}

/**
 * Default email threading service instance
 */
export const emailThreadingService = new EmailThreadingService();