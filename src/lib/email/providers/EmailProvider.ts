import type { EmailMessage, EmailAttachment, EmailIntegration } from '@prisma/client';

/**
 * Configuration for email provider connections
 */
export interface EmailProviderConfig {
  // Common fields
  provider: 'MICROSOFT_GRAPH' | 'GMAIL' | 'GENERIC_IMAP' | 'GENERIC_POP3';
  
  // OAuth configuration (Microsoft Graph, Gmail)
  clientId?: string;
  clientSecret?: string;
  tenantId?: string; // Microsoft specific
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  
  // IMAP/POP3 configuration
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  
  // Common settings
  syncInterval?: number; // Sync interval in seconds
  maxMessagesPerSync?: number;
  enableWebhooks?: boolean;
  webhookUrl?: string;
}

/**
 * Represents an email message before it's stored in the database
 */
export interface EmailMessageData {
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string;
  bccEmails?: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachmentData[];
  receivedAt: Date;
  priority?: number;
}

/**
 * Represents an email attachment before it's stored in the database
 */
export interface EmailAttachmentData {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  content?: Buffer; // For small attachments
  storagePath?: string; // For large attachments
}

/**
 * Result of an email synchronization operation
 */
export interface SyncResult {
  success: boolean;
  messagesRetrieved: number;
  messagesProcessed: number;
  errors: string[];
  warnings: string[];
  lastSyncTime: Date;
}

/**
 * Email provider connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    server?: string;
    port?: number;
    authentication?: boolean;
    folders?: string[];
    quotaInfo?: {
      used: number;
      total: number;
      unit: string;
    };
  };
  error?: string;
}

/**
 * OAuth token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Webhook subscription information
 */
export interface WebhookSubscription {
  id: string;
  url: string;
  expiresAt: Date;
  resource: string;
  events: string[];
}

/**
 * Abstract base class for email providers
 * All email provider implementations must extend this class
 */
export abstract class EmailProvider {
  protected config: EmailProviderConfig;
  protected integrationId: string;

  constructor(config: EmailProviderConfig, integrationId: string) {
    this.config = config;
    this.integrationId = integrationId;
  }

  /**
   * Test the connection to the email provider
   */
  abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * Authenticate with the email provider
   * For OAuth providers, this may involve token exchange
   */
  abstract authenticate(): Promise<boolean>;

  /**
   * Refresh OAuth tokens if needed
   */
  abstract refreshTokens(): Promise<TokenRefreshResult>;

  /**
   * Retrieve new messages from the email provider
   * @param since - Only retrieve messages since this date
   * @param maxMessages - Maximum number of messages to retrieve
   */
  abstract retrieveMessages(since?: Date, maxMessages?: number): Promise<EmailMessageData[]>;

  /**
   * Mark a message as processed (read, archived, etc.)
   * @param messageId - The message ID to mark
   */
  abstract markMessageAsProcessed(messageId: string): Promise<boolean>;

  /**
   * Send a reply to an email message
   * @param originalMessageId - ID of the message being replied to
   * @param replyContent - Content of the reply
   * @param replySubject - Subject of the reply
   */
  abstract sendReply(
    originalMessageId: string, 
    replyContent: string, 
    replySubject: string
  ): Promise<boolean>;

  /**
   * Set up webhook notifications for real-time email processing
   * @param webhookUrl - URL to receive webhook notifications
   */
  abstract setupWebhook(webhookUrl: string): Promise<WebhookSubscription | null>;

  /**
   * Remove webhook subscription
   * @param subscriptionId - ID of the subscription to remove
   */
  abstract removeWebhook(subscriptionId: string): Promise<boolean>;

  /**
   * Get information about the email account/mailbox
   */
  abstract getAccountInfo(): Promise<{
    email: string;
    displayName?: string;
    quotaUsed?: number;
    quotaTotal?: number;
    lastActivity?: Date;
  }>;

  /**
   * Validate the provider configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get provider-specific rate limits and quotas
   */
  abstract getRateLimits(): {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    currentUsage?: {
      minute: number;
      hour: number;
      day: number;
    };
  };

  /**
   * Cleanup resources and close connections
   */
  abstract disconnect(): Promise<void>;

  /**
   * Get the provider type
   */
  getProviderType(): string {
    return this.config.provider;
  }

  /**
   * Update the provider configuration
   */
  updateConfig(newConfig: Partial<EmailProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the current configuration (without sensitive data)
   */
  getConfig(): Omit<EmailProviderConfig, 'clientSecret' | 'password' | 'accessToken' | 'refreshToken'> {
    const { clientSecret, password, accessToken, refreshToken, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Check if tokens need refresh (for OAuth providers)
   */
  protected needsTokenRefresh(): boolean {
    if (!this.config.tokenExpiry) return false;
    const now = new Date();
    const expiry = new Date(this.config.tokenExpiry);
    // Refresh if expiring within 5 minutes
    return (expiry.getTime() - now.getTime()) < (5 * 60 * 1000);
  }

  /**
   * Validate required configuration fields
   */
  protected validateRequiredFields(requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => !this.config[field as keyof EmailProviderConfig]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  protected async handleRateLimit(attempt: number = 1): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Parse email addresses from various formats
   */
  protected parseEmailAddresses(addresses: string): { email: string; name?: string }[] {
    if (!addresses) return [];
    
    return addresses.split(',').map(addr => {
      const trimmed = addr.trim();
      const match = trimmed.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
      }
      return { email: trimmed };
    });
  }

  /**
   * Sanitize email content for security
   */
  protected sanitizeContent(content: string): string {
    if (!content) return '';
    
    // Basic sanitization - remove potentially dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}

/**
 * Factory function to create email provider instances
 */
export function createEmailProvider(
  config: EmailProviderConfig, 
  integrationId: string
): EmailProvider {
  switch (config.provider) {
    case 'MICROSOFT_GRAPH':
      // Dynamic import to avoid bundling unused providers
      const { MicrosoftGraphProvider } = require('./MicrosoftGraphProvider');
      return new MicrosoftGraphProvider(config, integrationId);
    case 'GMAIL':
      const { GmailProvider } = require('./GmailProvider');
      return new GmailProvider(config, integrationId);
    case 'GENERIC_IMAP':
      const { ImapProvider } = require('./ImapProvider');
      return new ImapProvider(config, integrationId);
    case 'GENERIC_POP3':
      const { Pop3Provider } = require('./Pop3Provider');
      return new Pop3Provider(config, integrationId);
    default:
      throw new Error(`Unsupported email provider: ${config.provider}`);
  }
}

/**
 * Email provider registry for managing multiple providers
 */
export class EmailProviderRegistry {
  private providers = new Map<string, EmailProvider>();

  /**
   * Register an email provider
   */
  register(integrationId: string, provider: EmailProvider): void {
    this.providers.set(integrationId, provider);
  }

  /**
   * Get a registered provider
   */
  get(integrationId: string): EmailProvider | undefined {
    return this.providers.get(integrationId);
  }

  /**
   * Remove a provider from registry
   */
  async remove(integrationId: string): Promise<void> {
    const provider = this.providers.get(integrationId);
    if (provider) {
      await provider.disconnect();
      this.providers.delete(integrationId);
    }
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clean up all providers
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.providers.values()).map(provider => 
      provider.disconnect().catch(err => console.error('Error disconnecting provider:', err))
    );
    
    await Promise.all(disconnectPromises);
    this.providers.clear();
  }
}

// Export singleton instance
export const emailProviderRegistry = new EmailProviderRegistry();