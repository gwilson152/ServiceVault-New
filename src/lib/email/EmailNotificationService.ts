import { prisma } from '@/lib/prisma';
import { validateTemplateVariables, getDefaultTemplate } from './templates';
import { EmailTemplateType } from '@prisma/client';
import Handlebars from 'handlebars';

/**
 * Email notification data
 */
export interface EmailNotification {
  to: string[];
  cc?: string[];
  bcc?: string[];
  templateType: EmailTemplateType;
  variables: Record<string, any>;
  accountId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  sendAt?: Date;
  trackDelivery?: boolean;
  trackOpens?: boolean;
  trackClicks?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Rendered email content
 */
export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  queueId?: string;
  error?: string;
  deliveredTo: string[];
  failedRecipients: string[];
}

/**
 * Template rendering context
 */
interface TemplateContext extends Record<string, any> {
  systemName: string;
  systemUrl: string;
  supportEmail: string;
  companyName: string;
  year: number;
}

/**
 * Email notification service for template-based email sending
 */
export class EmailNotificationService {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers for email templates
   */
  private registerHelpers(): void {
    // Conditional helper
    this.handlebars.registerHelper('if', function(conditional: any, options: any) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // Each helper for loops
    this.handlebars.registerHelper('each', function(context: any[], options: any) {
      let result = '';
      for (let i = 0; i < context.length; i++) {
        result += options.fn(context[i]);
      }
      return result;
    });

    // Format date helper
    this.handlebars.registerHelper('formatDate', function(date: Date, format?: string) {
      if (!date) return '';
      
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'time') {
        return d.toLocaleTimeString();
      } else {
        return d.toLocaleString();
      }
    });

    // Format currency helper
    this.handlebars.registerHelper('formatCurrency', function(amount: number, currency: string = 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Truncate text helper
    this.handlebars.registerHelper('truncate', function(text: string, length: number) {
      if (!text || text.length <= length) return text;
      return text.substring(0, length) + '...';
    });

    // Default value helper
    this.handlebars.registerHelper('default', function(value: any, defaultValue: any) {
      return value || defaultValue;
    });
  }

  /**
   * Send email notification using template
   */
  async sendNotification(notification: EmailNotification): Promise<EmailSendResult> {
    try {
      // Validate recipients
      if (!notification.to || notification.to.length === 0) {
        throw new Error('At least one recipient is required');
      }

      // Get template context
      const context = await this.buildTemplateContext(notification.accountId);
      const mergedVariables = { ...context, ...notification.variables };

      // Render email content
      const renderedEmail = await this.renderTemplate(notification.templateType, mergedVariables);

      if (!renderedEmail.isValid) {
        throw new Error(`Template rendering failed: ${renderedEmail.errors.join(', ')}`);
      }

      // Create email queue entry
      const emailQueue = await prisma.emailQueue.create({
        data: {
          to: notification.to,
          cc: notification.cc || [],
          bcc: notification.bcc || [],
          subject: renderedEmail.subject,
          htmlBody: renderedEmail.htmlBody,
          textBody: renderedEmail.textBody,
          templateType: notification.templateType,
          variables: mergedVariables,
          priority: notification.priority,
          sendAt: notification.sendAt,
          trackDelivery: notification.trackDelivery || false,
          trackOpens: notification.trackOpens || false,
          trackClicks: notification.trackClicks || false,
          metadata: notification.metadata || {},
          status: 'QUEUED'
        }
      });

      // If immediate sending is requested (no sendAt specified), process now
      if (!notification.sendAt) {
        return await this.processQueuedEmail(emailQueue.id);
      }

      return {
        success: true,
        queueId: emailQueue.id,
        deliveredTo: [],
        failedRecipients: []
      };

    } catch (error) {
      console.error('Email notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveredTo: [],
        failedRecipients: notification.to
      };
    }
  }

  /**
   * Render email template with variables
   */
  async renderTemplate(
    templateType: EmailTemplateType,
    variables: Record<string, any>
  ): Promise<RenderedEmail> {
    try {
      // Get template from database first, fall back to default
      let template = await prisma.emailTemplate.findFirst({
        where: {
          type: templateType,
          status: 'ACTIVE'
        }
      });

      // Use default template if none found in database
      if (!template) {
        const defaultTemplate = getDefaultTemplate(templateType);
        if (!defaultTemplate) {
          return {
            subject: '',
            htmlBody: '',
            textBody: '',
            isValid: false,
            errors: [`No template found for type: ${templateType}`],
            warnings: []
          };
        }

        template = {
          subject: defaultTemplate.subject,
          htmlBody: defaultTemplate.htmlBody,
          textBody: defaultTemplate.textBody,
          variables: JSON.stringify(defaultTemplate.variables)
        } as any;
      }

      // Validate variables
      const validation = validateTemplateVariables(templateType, variables);
      
      if (!validation.isValid) {
        return {
          subject: '',
          htmlBody: '',
          textBody: '',
          isValid: false,
          errors: validation.missingRequired.map(v => `Missing required variable: ${v}`),
          warnings: validation.warnings
        };
      }

      // Compile and render templates
      const subjectTemplate = this.handlebars.compile(template.subject);
      const htmlTemplate = this.handlebars.compile(template.htmlBody);
      const textTemplate = template.textBody ? this.handlebars.compile(template.textBody) : null;

      const renderedSubject = subjectTemplate(variables);
      const renderedHtml = htmlTemplate(variables);
      const renderedText = textTemplate ? textTemplate(variables) : undefined;

      return {
        subject: renderedSubject,
        htmlBody: renderedHtml,
        textBody: renderedText,
        isValid: true,
        errors: [],
        warnings: validation.warnings
      };

    } catch (error) {
      return {
        subject: '',
        htmlBody: '',
        textBody: '',
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Template rendering error'],
        warnings: []
      };
    }
  }

  /**
   * Build template context with system variables
   */
  private async buildTemplateContext(accountId?: string): Promise<TemplateContext> {
    // Get system settings
    const systemSettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['SYSTEM_NAME', 'SYSTEM_URL', 'SUPPORT_EMAIL', 'COMPANY_NAME']
        }
      }
    });

    const settingsMap = systemSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    const context: TemplateContext = {
      systemName: settingsMap.SYSTEM_NAME || 'ServiceVault',
      systemUrl: settingsMap.SYSTEM_URL || 'https://localhost:3000',
      supportEmail: settingsMap.SUPPORT_EMAIL || 'support@example.com',
      companyName: settingsMap.COMPANY_NAME || 'Your Company',
      year: new Date().getFullYear()
    };

    // Add account-specific context if provided
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId }
      });

      if (account) {
        context.accountName = account.name;
        context.accountId = account.id;
      }
    }

    return context;
  }

  /**
   * Process queued email for immediate sending
   */
  private async processQueuedEmail(queueId: string): Promise<EmailSendResult> {
    try {
      const queuedEmail = await prisma.emailQueue.findUnique({
        where: { id: queueId }
      });

      if (!queuedEmail) {
        throw new Error('Queued email not found');
      }

      // In a real implementation, this would integrate with an email service provider
      // like SendGrid, AWS SES, or similar. For now, we'll simulate sending.
      const mockSend = await this.simulateEmailSend(queuedEmail);

      // Update queue status
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: mockSend.success ? 'SENT' : 'FAILED',
          sentAt: mockSend.success ? new Date() : undefined,
          errorMessage: mockSend.error,
          attempts: 1
        }
      });

      return {
        success: mockSend.success,
        messageId: mockSend.messageId,
        queueId,
        error: mockSend.error,
        deliveredTo: mockSend.success ? queuedEmail.to as string[] : [],
        failedRecipients: mockSend.success ? [] : queuedEmail.to as string[]
      };

    } catch (error) {
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          attempts: 1
        }
      });

      throw error;
    }
  }

  /**
   * Simulate email sending (replace with real email service integration)
   */
  private async simulateEmailSend(queuedEmail: any): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate 95% success rate
    const success = Math.random() < 0.95;

    if (success) {
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'Simulated delivery failure'
      };
    }
  }

  /**
   * Send ticket created notification
   */
  async notifyTicketCreated(
    email: string,
    ticketData: {
      ticketNumber: string;
      ticketSubject: string;
      ticketStatus: string;
      ticketPriority: string;
      accountName: string;
      createdAt: Date;
      ticketLink: string;
      assignedTo?: string;
    },
    senderName?: string
  ): Promise<EmailSendResult> {
    return this.sendNotification({
      to: [email],
      templateType: 'EMAIL_TICKET_CREATED',
      priority: 'NORMAL',
      variables: {
        senderName: senderName || email.split('@')[0],
        senderEmail: email,
        ...ticketData,
        createdAt: ticketData.createdAt.toLocaleString()
      }
    });
  }

  /**
   * Send ticket reply notification
   */
  async notifyTicketReply(
    email: string,
    replyData: {
      ticketNumber: string;
      ticketSubject: string;
      ticketStatus: string;
      ticketPriority: string;
      replierName: string;
      replyTime: Date;
      replyContent: string;
      ticketLink: string;
      replyToEmail: string;
      messageId: string;
    },
    recipientName?: string
  ): Promise<EmailSendResult> {
    return this.sendNotification({
      to: [email],
      templateType: 'EMAIL_TICKET_REPLY',
      priority: 'NORMAL',
      variables: {
        recipientName: recipientName || email.split('@')[0],
        ...replyData,
        replyTime: replyData.replyTime.toLocaleString()
      }
    });
  }

  /**
   * Send security alert notification
   */
  async notifySecurityAlert(
    adminEmails: string[],
    alertData: {
      alertType: string;
      riskLevel: string;
      securityScore: number;
      senderEmail: string;
      emailSubject: string;
      detectedAt: Date;
      integrationName: string;
      actionTaken: string;
      threats?: string[];
      attachments?: Array<{ filename: string; threat: string }>;
      quarantineLink: string;
      securitySettingsLink: string;
    }
  ): Promise<EmailSendResult> {
    return this.sendNotification({
      to: adminEmails,
      templateType: 'EMAIL_SECURITY_ALERT',
      priority: 'HIGH',
      variables: {
        adminName: 'Administrator',
        ...alertData,
        detectedAt: alertData.detectedAt.toLocaleString()
      }
    });
  }

  /**
   * Send integration error notification
   */
  async notifyIntegrationError(
    adminEmails: string[],
    errorData: {
      integrationName: string;
      providerType: string;
      accountName: string;
      errorType: string;
      errorTime: Date;
      integrationStatus: string;
      errorMessage: string;
      suggestedActions?: string[];
      affectedFeatures?: string;
      integrationLink: string;
      supportLink: string;
    }
  ): Promise<EmailSendResult> {
    return this.sendNotification({
      to: adminEmails,
      templateType: 'EMAIL_INTEGRATION_ERROR',
      priority: 'HIGH',
      variables: {
        adminName: 'Administrator',
        ...errorData,
        errorTime: errorData.errorTime.toLocaleString()
      }
    });
  }

  /**
   * Send auto-response email
   */
  async sendAutoResponse(
    email: string,
    responseData: {
      originalSubject: string;
      companyName: string;
      responseAction: string;
      expectedResponseTime: string;
      businessHours: string;
      ticketCreated?: boolean;
      ticketNumber?: string;
      ticketStatus?: string;
      ticketPriority?: string;
      ticketLink?: string;
      customMessage?: string;
      emergencyContact?: string;
    },
    senderName?: string
  ): Promise<EmailSendResult> {
    return this.sendNotification({
      to: [email],
      templateType: 'EMAIL_AUTO_RESPONSE',
      priority: 'NORMAL',
      variables: {
        senderName: senderName || email.split('@')[0],
        ...responseData
      }
    });
  }

  /**
   * Get email queue statistics
   */
  async getQueueStatistics(): Promise<{
    queued: number;
    processing: number;
    sent: number;
    failed: number;
    totalToday: number;
    deliveryRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [queued, processing, sent, failed, totalToday] = await Promise.all([
      prisma.emailQueue.count({ where: { status: 'QUEUED' } }),
      prisma.emailQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.emailQueue.count({ where: { status: 'SENT' } }),
      prisma.emailQueue.count({ where: { status: 'FAILED' } }),
      prisma.emailQueue.count({ where: { createdAt: { gte: today } } })
    ]);

    const deliveryRate = totalToday > 0 ? (sent / totalToday) * 100 : 0;

    return {
      queued,
      processing,
      sent,
      failed,
      totalToday,
      deliveryRate
    };
  }

  /**
   * Process email queue (should be called by a background worker)
   */
  async processEmailQueue(limit: number = 10): Promise<void> {
    const queuedEmails = await prisma.emailQueue.findMany({
      where: {
        status: 'QUEUED',
        sendAt: {
          lte: new Date()
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    });

    for (const email of queuedEmails) {
      try {
        await this.processQueuedEmail(email.id);
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error);
      }
    }
  }

  /**
   * Retry failed emails
   */
  async retryFailedEmails(maxRetries: number = 3): Promise<void> {
    const failedEmails = await prisma.emailQueue.findMany({
      where: {
        status: 'FAILED',
        attempts: {
          lt: maxRetries
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    for (const email of failedEmails) {
      try {
        // Reset to queued status for retry
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'QUEUED',
            errorMessage: null
          }
        });

        await this.processQueuedEmail(email.id);
      } catch (error) {
        console.error(`Failed to retry email ${email.id}:`, error);
      }
    }
  }
}

/**
 * Default email notification service instance
 */
export const emailNotificationService = new EmailNotificationService();