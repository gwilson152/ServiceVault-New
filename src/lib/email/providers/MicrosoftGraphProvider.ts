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
 * Microsoft Graph API endpoints
 */
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';
const GRAPH_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/User.Read'
];

/**
 * Microsoft Graph message format
 */
interface GraphMessage {
  id: string;
  internetMessageId: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  bccRecipients?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  hasAttachments: boolean;
  internetMessageHeaders: Array<{
    name: string;
    value: string;
  }>;
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  parentFolderId: string;
}

/**
 * Microsoft Graph attachment format
 */
interface GraphAttachment {
  '@odata.type': string;
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentId?: string;
  contentBytes?: string; // Base64 encoded
  contentLocation?: string;
}

/**
 * Microsoft Graph user information
 */
interface GraphUser {
  id: string;
  mail: string;
  displayName: string;
  userPrincipalName: string;
}

/**
 * Microsoft Graph OAuth token response
 */
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

/**
 * Microsoft Graph webhook subscription
 */
interface GraphSubscription {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

/**
 * Microsoft Graph provider implementation
 * Handles OAuth 2.0 authentication and email operations via Microsoft Graph API
 */
export class MicrosoftGraphProvider extends EmailProvider {
  private accessToken?: string;
  private currentUser?: GraphUser;

  constructor(config: EmailProviderConfig, integrationId: string) {
    super(config, integrationId);
    
    // Validate required Microsoft Graph configuration
    this.validateRequiredFields(['clientId', 'clientSecret', 'tenantId']);
    
    this.accessToken = config.accessToken;
  }

  /**
   * Test connection to Microsoft Graph
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
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          message: 'Failed to retrieve user information',
          error: 'Invalid or expired token'
        };
      }

      // Test by getting inbox folder
      const inboxResponse = await this.makeGraphRequest('GET', '/me/mailFolders/inbox');
      if (!inboxResponse.ok) {
        return {
          success: false,
          message: 'Failed to access mailbox',
          error: `HTTP ${inboxResponse.status}: ${inboxResponse.statusText}`
        };
      }

      return {
        success: true,
        message: `Successfully connected to ${user.mail}`,
        details: {
          server: 'Microsoft Graph API',
          authentication: true,
          folders: ['Inbox', 'Sent Items', 'Drafts', 'Deleted Items'],
          quotaInfo: {
            used: 0, // Graph doesn't provide quota info directly
            total: 0,
            unit: 'MB'
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
   * Authenticate with Microsoft Graph using OAuth 2.0
   */
  async authenticate(): Promise<boolean> {
    try {
      // Check if current token is valid
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
      // This would typically involve redirecting user to OAuth consent flow
      throw new Error('No valid token available. User needs to re-authenticate.');

    } catch (error) {
      console.error('Microsoft Graph authentication failed:', error);
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
      const tokenUrl = TOKEN_ENDPOINT.replace('{tenantId}', this.config.tenantId!);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          scope: GRAPH_SCOPES.join(' ')
        })
      });

      const tokenData: TokenResponse = await response.json();

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
        refreshToken: tokenData.refresh_token,
        tokenExpiry: expiresAt
      });

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
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
   * Retrieve messages from Microsoft Graph
   */
  async retrieveMessages(since?: Date, maxMessages: number = 50): Promise<EmailMessageData[]> {
    try {
      await this.authenticate();

      let url = `/me/messages?$top=${maxMessages}&$orderby=receivedDateTime desc`;
      
      // Add date filter if specified
      if (since) {
        const isoDate = since.toISOString();
        url += `&$filter=receivedDateTime gt ${isoDate}`;
      }

      // Add expand to get internet headers and body
      url += '&$expand=internetMessageHeaders';

      const response = await this.makeGraphRequest('GET', url);
      if (!response.ok) {
        throw new Error(`Failed to retrieve messages: ${response.statusText}`);
      }

      const data = await response.json();
      const messages: GraphMessage[] = data.value || [];

      const emailMessages: EmailMessageData[] = [];

      for (const message of messages) {
        try {
          const emailMessage = await this.convertGraphMessageToEmailData(message);
          emailMessages.push(emailMessage);
        } catch (error) {
          console.error(`Failed to convert message ${message.id}:`, error);
        }
      }

      return emailMessages;

    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      return [];
    }
  }

  /**
   * Mark message as processed (read)
   */
  async markMessageAsProcessed(messageId: string): Promise<boolean> {
    try {
      await this.authenticate();

      const response = await this.makeGraphRequest('PATCH', `/me/messages/${messageId}`, {
        isRead: true
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

      const replyData = {
        message: {
          subject: replySubject,
          body: {
            contentType: 'html',
            content: replyContent
          }
        }
      };

      const response = await this.makeGraphRequest('POST', `/me/messages/${originalMessageId}/reply`, replyData);
      
      return response.ok;
    } catch (error) {
      console.error(`Failed to send reply to message ${originalMessageId}:`, error);
      return false;
    }
  }

  /**
   * Setup webhook subscription for real-time notifications
   */
  async setupWebhook(webhookUrl: string): Promise<WebhookSubscription | null> {
    try {
      await this.authenticate();

      // Microsoft Graph subscription expires max 3 days for mail resource
      const expirationDateTime = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString();
      
      const subscriptionData = {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: '/me/messages',
        expirationDateTime,
        clientState: this.integrationId // Use integration ID as client state for verification
      };

      const response = await this.makeGraphRequest('POST', '/subscriptions', subscriptionData);
      
      if (!response.ok) {
        throw new Error(`Failed to create subscription: ${response.statusText}`);
      }

      const subscription: GraphSubscription = await response.json();

      return {
        id: subscription.id,
        url: webhookUrl,
        expiresAt: new Date(subscription.expirationDateTime),
        resource: subscription.resource,
        events: [subscription.changeType]
      };

    } catch (error) {
      console.error('Failed to setup webhook:', error);
      return null;
    }
  }

  /**
   * Remove webhook subscription
   */
  async removeWebhook(subscriptionId: string): Promise<boolean> {
    try {
      await this.authenticate();

      const response = await this.makeGraphRequest('DELETE', `/subscriptions/${subscriptionId}`);
      
      return response.ok || response.status === 404; // 404 is OK - subscription doesn't exist
    } catch (error) {
      console.error(`Failed to remove webhook subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<{
    email: string;
    displayName?: string;
    quotaUsed?: number;
    quotaTotal?: number;
    lastActivity?: Date;
  }> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        throw new Error('Could not retrieve user information');
      }

      return {
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        quotaUsed: undefined, // Microsoft Graph doesn't provide quota information
        quotaTotal: undefined,
        lastActivity: new Date()
      };

    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<boolean> {
    try {
      this.validateRequiredFields(['clientId', 'clientSecret', 'tenantId']);
      
      // Test authentication
      return await this.authenticate();
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get Microsoft Graph rate limits
   */
  getRateLimits() {
    return {
      requestsPerMinute: 1200, // Microsoft Graph throttling limits
      requestsPerHour: 72000,
      requestsPerDay: 1728000,
      currentUsage: undefined // Microsoft Graph doesn't provide current usage
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    // Clear tokens and user info
    this.accessToken = undefined;
    this.currentUser = undefined;
  }

  /**
   * Make authenticated request to Microsoft Graph API
   */
  private async makeGraphRequest(method: string, endpoint: string, body?: any): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;
    
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

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request once
      return fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    }

    return response;
  }

  /**
   * Get current user information
   */
  private async getCurrentUser(): Promise<GraphUser | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const response = await this.makeGraphRequest('GET', '/me');
      
      if (!response.ok) {
        return null;
      }

      this.currentUser = await response.json();
      return this.currentUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Convert Graph message to EmailMessageData
   */
  private async convertGraphMessageToEmailData(message: GraphMessage): Promise<EmailMessageData> {
    // Extract headers map
    const headers: Record<string, string> = {};
    message.internetMessageHeaders.forEach(header => {
      headers[header.name] = header.value;
    });

    // Determine thread ID and in-reply-to
    const threadId = message.conversationId;
    const inReplyTo = headers['In-Reply-To'] || undefined;

    // Parse recipients
    const toEmails = message.toRecipients.map(r => `${r.emailAddress.name} <${r.emailAddress.address}>`).join(', ');
    const ccEmails = message.ccRecipients?.map(r => `${r.emailAddress.name} <${r.emailAddress.address}>`).join(', ');
    const bccEmails = message.bccRecipients?.map(r => `${r.emailAddress.name} <${r.emailAddress.address}>`).join(', ');

    // Process attachments if present
    let attachments: EmailAttachmentData[] = [];
    if (message.hasAttachments) {
      attachments = await this.getMessageAttachments(message.id);
    }

    // Determine priority
    const priority = message.importance === 'high' ? 1 : message.importance === 'low' ? 9 : 5;

    return {
      messageId: message.internetMessageId,
      threadId,
      inReplyTo,
      fromEmail: message.from.emailAddress.address,
      fromName: message.from.emailAddress.name,
      toEmail: toEmails,
      toName: undefined, // Multiple recipients, names are in the email string
      ccEmails,
      bccEmails,
      subject: message.subject,
      textBody: message.body.contentType === 'text' ? message.body.content : undefined,
      htmlBody: message.body.contentType === 'html' ? message.body.content : undefined,
      headers,
      attachments,
      receivedAt: new Date(message.receivedDateTime),
      priority
    };
  }

  /**
   * Get attachments for a message
   */
  private async getMessageAttachments(messageId: string): Promise<EmailAttachmentData[]> {
    try {
      const response = await this.makeGraphRequest('GET', `/me/messages/${messageId}/attachments`);
      
      if (!response.ok) {
        console.error(`Failed to get attachments for message ${messageId}`);
        return [];
      }

      const data = await response.json();
      const graphAttachments: GraphAttachment[] = data.value || [];

      return graphAttachments.map(attachment => ({
        filename: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size,
        contentId: attachment.contentId,
        content: attachment.contentBytes ? Buffer.from(attachment.contentBytes, 'base64') : undefined
      }));

    } catch (error) {
      console.error(`Failed to retrieve attachments for message ${messageId}:`, error);
      return [];
    }
  }
}

/**
 * Factory function for creating Microsoft Graph provider instances
 */
export function createMicrosoftGraphProvider(
  config: EmailProviderConfig, 
  integrationId: string
): MicrosoftGraphProvider {
  return new MicrosoftGraphProvider(config, integrationId);
}