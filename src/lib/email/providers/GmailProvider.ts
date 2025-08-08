import { 
  EmailProvider, 
  EmailProviderConfig, 
  EmailMessageData, 
  EmailAttachmentData,
  ConnectionTestResult, 
  TokenRefreshResult,
  WebhookSubscription,
  SyncResult 
} from './EmailProvider';

/**
 * Gmail API endpoints and configuration
 */
const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Gmail API message format
 */
interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailPayload;
  sizeEstimate: number;
}

/**
 * Gmail message payload structure
 */
interface GmailPayload {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: GmailBody;
  parts?: GmailPayload[];
}

/**
 * Gmail message header
 */
interface GmailHeader {
  name: string;
  value: string;
}

/**
 * Gmail message body
 */
interface GmailBody {
  attachmentId?: string;
  size: number;
  data?: string; // Base64 encoded
}

/**
 * Gmail attachment
 */
interface GmailAttachment {
  attachmentId: string;
  size: number;
  data: string; // Base64 encoded
}

/**
 * Gmail user profile
 */
interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

/**
 * Gmail OAuth token response
 */
interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

/**
 * Gmail push notification subscription
 */
interface GmailPushSubscription {
  historyId: string;
  expiration: string;
}

/**
 * Gmail provider implementation
 * Handles OAuth 2.0 authentication and email operations via Gmail API
 */
export class GmailProvider extends EmailProvider {
  private accessToken?: string;
  private userProfile?: GmailProfile;
  private quotaUsage = {
    requests: 0,
    lastResetTime: Date.now()
  };

  // Gmail API rate limits per user
  private readonly RATE_LIMITS = {
    requestsPerSecond: 10,
    requestsPerMinute: 600,
    requestsPerHour: 36000,
    requestsPerDay: 1000000000, // 1 billion quota units per day
    quotaPerRequest: {
      list: 5,
      get: 5,
      send: 100,
      modify: 5
    }
  };

  constructor(config: EmailProviderConfig, integrationId: string) {
    super(config, integrationId);
    
    // Validate required Gmail configuration
    this.validateRequiredFields(['clientId', 'clientSecret']);
    
    this.accessToken = config.accessToken;
  }

  /**
   * Test connection to Gmail API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Ensure we have a valid token
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return {
          success: false,
          message: 'Authentication failed',
          error: 'Could not obtain access token'
        };
      }

      // Test by getting user profile
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          success: false,
          message: 'Failed to retrieve user profile',
          error: 'Invalid or expired token'
        };
      }

      // Test by listing labels (folders)
      const labelsResponse = await this.makeGmailRequest('GET', '/labels');
      if (!labelsResponse.ok) {
        return {
          success: false,
          message: 'Failed to access mailbox',
          error: `HTTP ${labelsResponse.status}: ${labelsResponse.statusText}`
        };
      }

      const labelsData = await labelsResponse.json();
      const folderNames = labelsData.labels?.map((l: any) => l.name) || [];

      return {
        success: true,
        message: `Successfully connected to ${profile.emailAddress}`,
        details: {
          server: 'Gmail API',
          authentication: true,
          folders: folderNames,
          quotaInfo: {
            used: profile.messagesTotal || 0,
            total: 15000, // Gmail free tier limit (15GB, approximate message count)
            unit: 'messages'
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Authenticate with Gmail using OAuth 2.0
   */
  async authenticate(): Promise<boolean> {
    try {
      // Check if current token is valid and not expired
      if (this.accessToken && !this.needsTokenRefresh()) {
        return true;
      }

      // Try to refresh token if we have refresh token
      if (this.config.refreshToken) {
        const refreshResult = await this.refreshTokens();
        if (refreshResult.success) {
          this.accessToken = refreshResult.accessToken;
          return true;
        }
      }

      // If no refresh token or refresh failed, need to re-authenticate
      throw new Error('No valid token available. User needs to re-authenticate.');

    } catch (error) {
      console.error('Gmail authentication failed:', error);
      return false;
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(): Promise<TokenRefreshResult> {
    if (!this.config.refreshToken) {
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!
        })
      });

      const tokenData: GoogleTokenResponse = await response.json();

      if (tokenData.error) {
        return {
          success: false,
          error: `Token refresh failed: ${tokenData.error_description || tokenData.error}`
        };
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      // Update configuration with new tokens
      this.updateConfig({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.config.refreshToken, // Google may not always return new refresh token
        tokenExpiry: expiresAt
      });

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || this.config.refreshToken,
        expiresAt
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Retrieve messages from Gmail
   */
  async retrieveMessages(since?: Date, maxMessages: number = 50): Promise<EmailMessageData[]> {
    try {
      await this.authenticate();

      let query = '';
      if (since) {
        const afterDate = Math.floor(since.getTime() / 1000);
        query = `after:${afterDate}`;
      }

      // Get message list first
      let url = `/messages?maxResults=${Math.min(maxMessages, 500)}&q=${encodeURIComponent(query)}`;
      
      const listResponse = await this.makeGmailRequest('GET', url);
      if (!listResponse.ok) {
        throw new Error(`Failed to list messages: ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const messageIds = listData.messages || [];

      if (messageIds.length === 0) {
        return [];
      }

      // Get full message details
      const emailMessages: EmailMessageData[] = [];
      const batchSize = 10; // Process in batches to avoid rate limiting

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        
        const messagePromises = batch.map(async (msg: { id: string }) => {
          try {
            await this.checkRateLimit();
            const messageResponse = await this.makeGmailRequest('GET', `/messages/${msg.id}?format=full`);
            
            if (messageResponse.ok) {
              const message: GmailMessage = await messageResponse.json();
              return await this.convertGmailMessageToEmailData(message);
            }
            return null;
          } catch (error) {
            console.error(`Failed to retrieve message ${msg.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(messagePromises);
        
        // Filter out failed messages and add to results
        batchResults.forEach(message => {
          if (message) {
            emailMessages.push(message);
          }
        });

        // Pause between batches to respect rate limits
        if (i + batchSize < messageIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return emailMessages.slice(0, maxMessages); // Ensure we don't exceed requested limit

    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      return [];
    }
  }

  /**
   * Mark message as processed (remove from inbox, add processed label)
   */
  async markMessageAsProcessed(messageId: string): Promise<boolean> {
    try {
      await this.authenticate();

      // Gmail doesn't have a direct "mark as processed" - we'll mark as read and remove from inbox
      const response = await this.makeGmailRequest('POST', `/messages/${messageId}/modify`, {
        removeLabelIds: ['UNREAD', 'INBOX'],
        addLabelIds: [] // Could add custom label here
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to mark message ${messageId} as processed:`, error);
      return false;
    }
  }

  /**
   * Send reply to email message
   */
  async sendReply(originalMessageId: string, replyContent: string, replySubject: string): Promise<boolean> {
    try {
      await this.authenticate();

      // Get original message to extract thread ID and references
      const originalResponse = await this.makeGmailRequest('GET', `/messages/${originalMessageId}?format=metadata`);
      if (!originalResponse.ok) {
        throw new Error('Failed to get original message');
      }

      const originalMessage = await originalResponse.json();
      const threadId = originalMessage.threadId;
      
      // Find Message-ID from headers
      const messageIdHeader = originalMessage.payload.headers.find((h: GmailHeader) => 
        h.name.toLowerCase() === 'message-id'
      );
      const originalMessageId2 = messageIdHeader?.value;

      // Create reply message
      const replyMessage = this.createReplyMessage(replySubject, replyContent, originalMessageId2);
      
      const sendResponse = await this.makeGmailRequest('POST', '/messages/send', {
        threadId,
        raw: this.encodeMessage(replyMessage)
      });

      return sendResponse.ok;
    } catch (error) {
      console.error(`Failed to send reply to message ${originalMessageId}:`, error);
      return false;
    }
  }

  /**
   * Setup webhook using Gmail push notifications
   */
  async setupWebhook(webhookUrl: string): Promise<WebhookSubscription | null> {
    try {
      await this.authenticate();

      // Gmail uses Pub/Sub for push notifications
      // This requires Google Cloud Pub/Sub topic setup
      const watchRequest = {
        labelIds: ['INBOX'],
        topicName: `projects/${this.config.clientId}/topics/gmail-notifications`
      };

      const response = await this.makeGmailRequest('POST', '/watch', watchRequest);
      
      if (!response.ok) {
        console.warn('Gmail push notifications require Google Cloud Pub/Sub setup');
        return null;
      }

      const watchResponse: GmailPushSubscription = await response.json();

      return {
        id: watchResponse.historyId,
        url: webhookUrl,
        expiresAt: new Date(parseInt(watchResponse.expiration)),
        resource: 'messages',
        events: ['created']
      };

    } catch (error) {
      console.error('Failed to setup Gmail webhook:', error);
      return null;
    }
  }

  /**
   * Remove webhook subscription (stop watching)
   */
  async removeWebhook(subscriptionId: string): Promise<boolean> {
    try {
      await this.authenticate();

      const response = await this.makeGmailRequest('POST', '/stop');
      
      return response.ok;
    } catch (error) {
      console.error('Failed to remove Gmail webhook:', error);
      return false;
    }
  }

  /**
   * Get Gmail account information
   */
  async getAccountInfo(): Promise<{
    email: string;
    displayName?: string;
    quotaUsed?: number;
    quotaTotal?: number;
    lastActivity?: Date;
  }> {
    try {
      const profile = await this.getUserProfile();
      
      if (!profile) {
        throw new Error('Could not retrieve Gmail profile');
      }

      return {
        email: profile.emailAddress,
        displayName: profile.emailAddress.split('@')[0], // Gmail doesn't provide display name in profile
        quotaUsed: profile.messagesTotal,
        quotaTotal: 15000000000, // 15GB in bytes (approximate)
        lastActivity: new Date()
      };

    } catch (error) {
      console.error('Failed to get Gmail account info:', error);
      throw error;
    }
  }

  /**
   * Validate Gmail configuration
   */
  async validateConfig(): Promise<boolean> {
    try {
      this.validateRequiredFields(['clientId', 'clientSecret']);
      
      // Test authentication
      return await this.authenticate();
    } catch (error) {
      console.error('Gmail configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get Gmail API rate limits
   */
  getRateLimits() {
    return {
      requestsPerMinute: this.RATE_LIMITS.requestsPerMinute,
      requestsPerHour: this.RATE_LIMITS.requestsPerHour,
      requestsPerDay: this.RATE_LIMITS.requestsPerDay,
      currentUsage: {
        minute: this.quotaUsage.requests,
        hour: Math.floor(this.quotaUsage.requests / 60),
        day: Math.floor(this.quotaUsage.requests / 1440)
      }
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Clear tokens and profile
    this.accessToken = undefined;
    this.userProfile = undefined;
    this.quotaUsage = { requests: 0, lastResetTime: Date.now() };
  }

  /**
   * Make authenticated request to Gmail API with rate limiting
   */
  private async makeGmailRequest(method: string, endpoint: string, body?: any): Promise<Response> {
    await this.checkRateLimit();

    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${GMAIL_API_BASE_URL}/users/me${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json'
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    // Track quota usage
    this.quotaUsage.requests++;

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request once
      return this.makeGmailRequest(method, endpoint, body);
    }

    // Handle quota exceeded
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.error?.message?.includes('quotaExceeded')) {
        throw new Error('Gmail API quota exceeded. Please try again later.');
      }
    }

    return response;
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceReset = now - this.quotaUsage.lastResetTime;
    
    // Reset quota counter every minute
    if (timeSinceReset >= 60000) {
      this.quotaUsage = { requests: 0, lastResetTime: now };
      return;
    }

    // Check if we're approaching rate limits
    if (this.quotaUsage.requests >= this.RATE_LIMITS.requestsPerMinute * 0.9) {
      const waitTime = 60000 - timeSinceReset;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.quotaUsage = { requests: 0, lastResetTime: Date.now() };
    }
  }

  /**
   * Get Gmail user profile
   */
  private async getUserProfile(): Promise<GmailProfile | null> {
    if (this.userProfile) {
      return this.userProfile;
    }

    try {
      const response = await this.makeGmailRequest('GET', '/profile');
      
      if (!response.ok) {
        return null;
      }

      this.userProfile = await response.json();
      return this.userProfile;
    } catch (error) {
      console.error('Failed to get Gmail profile:', error);
      return null;
    }
  }

  /**
   * Convert Gmail message to EmailMessageData
   */
  private async convertGmailMessageToEmailData(message: GmailMessage): Promise<EmailMessageData> {
    // Extract headers
    const headers: Record<string, string> = {};
    message.payload.headers.forEach(header => {
      headers[header.name.toLowerCase()] = header.value;
    });

    // Get thread information
    const threadId = message.threadId;
    const inReplyTo = headers['in-reply-to'];

    // Extract message content
    const { textBody, htmlBody } = this.extractMessageContent(message.payload);

    // Process attachments
    const attachments = await this.extractAttachments(message.id, message.payload);

    // Parse addresses
    const fromAddress = this.parseEmailAddresses(headers['from'] || '')[0];
    const toAddresses = this.parseEmailAddresses(headers['to'] || '');
    const ccAddresses = this.parseEmailAddresses(headers['cc'] || '');

    // Determine priority from headers
    let priority = 5; // Normal
    if (headers['x-priority']) {
      const xPriority = parseInt(headers['x-priority']);
      priority = xPriority;
    } else if (headers['importance']) {
      const importance = headers['importance'].toLowerCase();
      priority = importance === 'high' ? 1 : importance === 'low' ? 9 : 5;
    }

    return {
      messageId: headers['message-id'] || message.id,
      threadId,
      inReplyTo,
      fromEmail: fromAddress?.email || '',
      fromName: fromAddress?.name,
      toEmail: toAddresses.map(a => `${a.name ? `${a.name} ` : ''}<${a.email}>`).join(', '),
      toName: toAddresses[0]?.name,
      ccEmails: ccAddresses.map(a => `${a.name ? `${a.name} ` : ''}<${a.email}>`).join(', '),
      subject: headers['subject'] || '',
      textBody,
      htmlBody,
      headers,
      attachments,
      receivedAt: new Date(parseInt(message.internalDate)),
      priority
    };
  }

  /**
   * Extract text and HTML content from Gmail message payload
   */
  private extractMessageContent(payload: GmailPayload): { textBody?: string; htmlBody?: string } {
    let textBody: string | undefined;
    let htmlBody: string | undefined;

    const extractFromPart = (part: GmailPayload) => {
      if (part.mimeType === 'text/plain' && part.body.data) {
        textBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      // Recursively check parts
      if (part.parts) {
        part.parts.forEach(subPart => extractFromPart(subPart));
      }
    };

    extractFromPart(payload);

    return { textBody, htmlBody };
  }

  /**
   * Extract attachments from Gmail message
   */
  private async extractAttachments(messageId: string, payload: GmailPayload): Promise<EmailAttachmentData[]> {
    const attachments: EmailAttachmentData[] = [];

    const extractFromPart = async (part: GmailPayload) => {
      if (part.filename && part.filename.length > 0) {
        try {
          let content: Buffer | undefined;

          if (part.body.attachmentId) {
            // Get attachment data
            const attachmentResponse = await this.makeGmailRequest(
              'GET', 
              `/messages/${messageId}/attachments/${part.body.attachmentId}`
            );
            
            if (attachmentResponse.ok) {
              const attachmentData: GmailAttachment = await attachmentResponse.json();
              content = Buffer.from(attachmentData.data, 'base64url');
            }
          } else if (part.body.data) {
            content = Buffer.from(part.body.data, 'base64');
          }

          attachments.push({
            filename: part.filename,
            contentType: part.mimeType,
            size: part.body.size,
            content: content && content.length < 1024 * 1024 ? content : undefined, // Only inline small attachments
            contentId: part.partId
          });
        } catch (error) {
          console.error(`Failed to extract attachment ${part.filename}:`, error);
        }
      }

      // Recursively check parts
      if (part.parts) {
        await Promise.all(part.parts.map(subPart => extractFromPart(subPart)));
      }
    };

    await extractFromPart(payload);

    return attachments;
  }

  /**
   * Create a reply message in RFC format
   */
  private createReplyMessage(subject: string, content: string, inReplyTo?: string): string {
    const date = new Date().toUTCString();
    const boundary = `----boundary_${Date.now()}_${Math.random()}`;

    let message = `Date: ${date}\r\n`;
    message += `Subject: ${subject}\r\n`;
    if (inReplyTo) {
      message += `In-Reply-To: ${inReplyTo}\r\n`;
    }
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: text/html; charset=utf-8\r\n`;
    message += `\r\n`;
    message += content;

    return message;
  }

  /**
   * Encode message for Gmail API
   */
  private encodeMessage(message: string): string {
    return Buffer.from(message).toString('base64url');
  }
}

/**
 * Factory function for creating Gmail provider instances
 */
export function createGmailProvider(
  config: EmailProviderConfig, 
  integrationId: string
): GmailProvider {
  return new GmailProvider(config, integrationId);
}