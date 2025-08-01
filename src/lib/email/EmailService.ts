import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { EmailTemplateType, EmailQueueStatus } from '@prisma/client';

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  testMode: boolean;
}

export interface EmailData {
  to: string;
  toName?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: number;
  scheduledAt?: Date;
  createdBy?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private settings: EmailSettings | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    try {
      // Get email settings from database
      const emailSettings = await prisma.emailSettings.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!emailSettings) {
        console.warn('No active email settings found. Email functionality disabled.');
        return;
      }

      this.settings = {
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpUsername: emailSettings.smtpUsername,
        smtpPassword: emailSettings.smtpPassword, // TODO: Decrypt password
        smtpSecure: emailSettings.smtpSecure,
        fromEmail: emailSettings.fromEmail,
        fromName: emailSettings.fromName,
        replyToEmail: emailSettings.replyToEmail || undefined,
        testMode: emailSettings.testMode
      };

      // Create nodemailer transporter configuration
      const transporterConfig: any = {
        host: this.settings.smtpHost,
        port: this.settings.smtpPort,
        secure: this.settings.smtpSecure
      };

      // Only add auth if username is provided
      if (this.settings.smtpUsername && this.settings.smtpUsername.trim() !== '') {
        transporterConfig.auth = {
          user: this.settings.smtpUsername,
          pass: this.settings.smtpPassword
        };
      }

      this.transporter = nodemailer.createTransporter(transporterConfig);

      // Verify connection
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
      this.settings = null;
    }
  }

  /**
   * Queue an email for sending
   */
  async queueEmail(emailData: EmailData): Promise<string> {
    try {
      if (!this.settings) {
        throw new Error('Email service not initialized');
      }

      const queueEntry = await prisma.emailQueue.create({
        data: {
          templateId: emailData.templateId || null,
          fromEmail: this.settings.fromEmail,
          fromName: this.settings.fromName,
          toEmail: emailData.to,
          toName: emailData.toName || null,
          ccEmails: emailData.cc ? JSON.stringify(emailData.cc) : null,
          bccEmails: emailData.bcc ? JSON.stringify(emailData.bcc) : null,
          subject: emailData.subject,
          htmlBody: emailData.htmlBody,
          textBody: emailData.textBody || null,
          variables: JSON.stringify(emailData.variables || {}),
          status: EmailQueueStatus.PENDING,
          priority: emailData.priority || 5,
          scheduledAt: emailData.scheduledAt || null,
          createdBy: emailData.createdBy || null
        }
      });

      // If not scheduled for later, attempt to send immediately
      if (!emailData.scheduledAt) {
        await this.processQueueEntry(queueEntry.id);
      }

      return queueEntry.id;
    } catch (error) {
      console.error('Failed to queue email:', error);
      throw error;
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplateEmail(
    templateType: EmailTemplateType,
    emailData: Omit<EmailData, 'subject' | 'htmlBody' | 'textBody'>,
    variables: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Get the template
      const template = await this.getTemplate(templateType);
      if (!template) {
        throw new Error(`No active template found for type: ${templateType}`);
      }

      // Process template variables
      const processedSubject = this.processTemplate(template.subject, variables);
      const processedHtmlBody = this.processTemplate(template.htmlBody, variables);
      const processedTextBody = template.textBody 
        ? this.processTemplate(template.textBody, variables)
        : undefined;

      return await this.queueEmail({
        ...emailData,
        templateId: template.id,
        subject: processedSubject,
        htmlBody: processedHtmlBody,
        textBody: processedTextBody,
        variables
      });
    } catch (error) {
      console.error('Failed to send template email:', error);
      throw error;
    }
  }

  /**
   * Process email queue entries
   */
  async processQueue(batchSize: number = 10): Promise<void> {
    try {
      if (!this.transporter || !this.settings) {
        console.warn('Email service not initialized, skipping queue processing');
        return;
      }

      // Get pending emails
      const pendingEmails = await prisma.emailQueue.findMany({
        where: {
          status: EmailQueueStatus.PENDING,
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: new Date() } }
          ]
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' }
        ],
        take: batchSize
      });

      console.log(`Processing ${pendingEmails.length} emails from queue`);

      for (const email of pendingEmails) {
        await this.processQueueEntry(email.id);
      }
    } catch (error) {
      console.error('Failed to process email queue:', error);
    }
  }

  /**
   * Process a single queue entry
   */
  private async processQueueEntry(queueId: string): Promise<void> {
    try {
      // Mark as sending
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: { status: EmailQueueStatus.SENDING }
      });

      const email = await prisma.emailQueue.findUnique({
        where: { id: queueId }
      });

      if (!email) {
        throw new Error(`Email queue entry not found: ${queueId}`);
      }

      if (this.settings?.testMode) {
        // In test mode, just log the email
        console.log('TEST MODE - Email would be sent:', {
          to: email.toEmail,
          subject: email.subject,
          scheduledAt: email.scheduledAt
        });

        await prisma.emailQueue.update({
          where: { id: queueId },
          data: {
            status: EmailQueueStatus.SENT,
            sentAt: new Date()
          }
        });
        return;
      }

      if (!this.transporter) {
        throw new Error('Email transporter not available');
      }

      // Send the email
      const mailOptions = {
        from: `${email.fromName} <${email.fromEmail}>`,
        to: email.toName ? `${email.toName} <${email.toEmail}>` : email.toEmail,
        cc: email.ccEmails ? JSON.parse(email.ccEmails) : undefined,
        bcc: email.bccEmails ? JSON.parse(email.bccEmails) : undefined,
        subject: email.subject,
        html: email.htmlBody,
        text: email.textBody || undefined,
        replyTo: this.settings?.replyToEmail
      };

      await this.transporter.sendMail(mailOptions);

      // Mark as sent
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: EmailQueueStatus.SENT,
          sentAt: new Date()
        }
      });

      console.log(`Email sent successfully: ${email.subject} to ${email.toEmail}`);
    } catch (error) {
      console.error(`Failed to send email ${queueId}:`, error);

      // Get current retry count
      const email = await prisma.emailQueue.findUnique({
        where: { id: queueId },
        select: { retryCount: true, maxRetries: true }
      });

      if (email && email.retryCount < email.maxRetries) {
        // Increment retry count and mark as pending for retry
        await prisma.emailQueue.update({
          where: { id: queueId },
          data: {
            status: EmailQueueStatus.PENDING,
            retryCount: { increment: 1 },
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      } else {
        // Mark as failed
        await prisma.emailQueue.update({
          where: { id: queueId },
          data: {
            status: EmailQueueStatus.FAILED,
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  }

  /**
   * Get active template by type
   */
  private async getTemplate(type: EmailTemplateType): Promise<EmailTemplate | null> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        type,
        status: 'ACTIVE'
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody || undefined,
      variables: JSON.parse(template.variables)
    };
  }

  /**
   * Process template variables in content
   */
  private processTemplate(content: string, variables: Record<string, any>): string {
    let processed = content;

    // Replace variables in format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });

    // Clean up any remaining unreplaced variables
    processed = processed.replace(/{{[^}]+}}/g, '');

    return processed;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  }> {
    const stats = await prisma.emailQueue.groupBy({
      by: ['status'],
      _count: true
    });

    return {
      pending: stats.find(s => s.status === EmailQueueStatus.PENDING)?._count || 0,
      sending: stats.find(s => s.status === EmailQueueStatus.SENDING)?._count || 0,
      sent: stats.find(s => s.status === EmailQueueStatus.SENT)?._count || 0,
      failed: stats.find(s => s.status === EmailQueueStatus.FAILED)?._count || 0
    };
  }

  /**
   * Cancel pending email
   */
  async cancelEmail(queueId: string): Promise<void> {
    await prisma.emailQueue.update({
      where: { id: queueId },
      data: { status: EmailQueueStatus.CANCELLED }
    });
  }

  /**
   * Retry failed email
   */
  async retryEmail(queueId: string): Promise<void> {
    await prisma.emailQueue.update({
      where: { id: queueId },
      data: {
        status: EmailQueueStatus.PENDING,
        retryCount: 0,
        failureReason: null
      }
    });
  }
}

// Global email service instance
export const emailService = new EmailService();