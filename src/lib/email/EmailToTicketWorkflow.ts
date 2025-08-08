import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { emailParser, type ParsedTicketData } from './EmailParser';
import { accountMappingService, type AccountMapping } from './AccountMappingService';
import { emailSecurityService, type SecurityCheckResult } from './EmailSecurityService';
import type { EmailMessageData, EmailAttachmentData } from './providers/EmailProvider';
import type { 
  Ticket, 
  Account, 
  AccountMembership, 
  EmailMessage, 
  EmailAttachment,
  EmailProcessingLog 
} from '@prisma/client';

/**
 * Ticket creation result
 */
export interface TicketCreationResult {
  success: boolean;
  ticket?: Ticket;
  emailMessage?: EmailMessage;
  error?: string;
  warnings: string[];
  processingTime: number;
  confidence: number;
  securityResult?: SecurityCheckResult;
  quarantined?: boolean;
}

/**
 * Email processing context
 */
export interface EmailProcessingContext {
  integrationId: string;
  systemUserId?: string; // User ID for permission checks (usually the integration owner)
  skipPermissionChecks?: boolean; // For system-level processing
  dryRun?: boolean; // Test mode - don't actually create tickets
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  // Ticket creation settings
  autoAssignTickets: boolean;
  defaultTicketStatus: string;
  defaultTicketPriority: string;
  
  // Processing rules
  minimumConfidenceThreshold: number; // 0-100
  allowDuplicateTickets: boolean;
  duplicateDetectionWindow: number; // Hours to check for duplicates
  
  // Email storage
  storeOriginalEmails: boolean;
  storeAttachments: boolean;
  maxAttachmentSize: number; // Bytes
  
  // Notification settings
  sendConfirmationEmails: boolean;
  notifyAssignedUsers: boolean;
  
  // Custom fields mapping
  customFieldMappings: Record<string, string>; // email field -> ticket field
  
  // Processing limits
  maxProcessingTime: number; // Milliseconds
  enableDetailedLogging: boolean;
  
  // Security settings
  enableSecurityScanning: boolean;
  quarantineThreshold: number; // Risk score threshold for quarantine
  blockThreshold: number; // Risk score threshold for blocking
  skipSecurityForTrustedSenders: boolean;
}

/**
 * Default workflow configuration
 */
const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  autoAssignTickets: true,
  defaultTicketStatus: 'OPEN',
  defaultTicketPriority: 'MEDIUM',
  minimumConfidenceThreshold: 50,
  allowDuplicateTickets: false,
  duplicateDetectionWindow: 24, // 24 hours
  storeOriginalEmails: true,
  storeAttachments: true,
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  sendConfirmationEmails: true,
  notifyAssignedUsers: false,
  customFieldMappings: {},
  maxProcessingTime: 30000, // 30 seconds
  enableDetailedLogging: true,
  enableSecurityScanning: true,
  quarantineThreshold: 60, // Quarantine emails with risk score >= 60
  blockThreshold: 80, // Block emails with risk score >= 80
  skipSecurityForTrustedSenders: true
};

/**
 * Main workflow service for converting emails to tickets
 */
export class EmailToTicketWorkflow {
  private config: WorkflowConfig;

  constructor(config?: Partial<WorkflowConfig>) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  }

  /**
   * Process email and create ticket
   */
  async processEmail(
    email: EmailMessageData,
    context: EmailProcessingContext
  ): Promise<TicketCreationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Start processing log
      await this.logProcessingStep(context.integrationId, null, 'EMAIL_RECEIVED', 'SUCCESS', {
        from: email.fromEmail,
        subject: email.subject,
        messageId: email.messageId
      });

      // Step 1: Security scan (if enabled)
      let securityResult: SecurityCheckResult | undefined;
      let quarantined = false;

      if (this.config.enableSecurityScanning) {
        securityResult = await emailSecurityService.checkEmailSecurity(email, context.integrationId);
        
        // Check if email should be blocked
        if (securityResult.score >= this.config.blockThreshold) {
          await this.logProcessingStep(context.integrationId, email.messageId, 'SECURITY_BLOCKED', 'BLOCKED', {
            securityScore: securityResult.score,
            riskLevel: securityResult.riskLevel,
            threats: securityResult.threats
          });
          
          return {
            success: false,
            error: `Email blocked due to security threats: ${securityResult.threats.join(', ')}`,
            warnings: securityResult.warnings,
            processingTime: Date.now() - startTime,
            confidence: 0,
            securityResult,
            quarantined: false
          };
        }

        // Check if email should be quarantined
        if (securityResult.score >= this.config.quarantineThreshold) {
          quarantined = true;
          warnings.push(`Email quarantined due to security concerns (score: ${securityResult.score})`);
          
          await this.logProcessingStep(context.integrationId, email.messageId, 'SECURITY_QUARANTINED', 'WARNING', {
            securityScore: securityResult.score,
            riskLevel: securityResult.riskLevel,
            warnings: securityResult.warnings
          });
        }

        // Add security warnings
        warnings.push(...securityResult.warnings);
      }

      // Step 2: Parse email content
      const parsedTicket = await emailParser.parseEmail(email);
      
      if (parsedTicket.confidence < this.config.minimumConfidenceThreshold) {
        return {
          success: false,
          error: `Email confidence too low: ${parsedTicket.confidence}% (minimum: ${this.config.minimumConfidenceThreshold}%)`,
          warnings,
          processingTime: Date.now() - startTime,
          confidence: parsedTicket.confidence,
          securityResult,
          quarantined
        };
      }

      await this.logProcessingStep(context.integrationId, null, 'EMAIL_PARSED', 'SUCCESS', {
        confidence: parsedTicket.confidence,
        isReply: parsedTicket.isReply,
        priority: parsedTicket.priority
      });

      // Step 2: Handle replies to existing tickets
      if (parsedTicket.isReply && parsedTicket.originalTicketNumber) {
        return await this.handleTicketReply(email, parsedTicket, context, startTime, warnings);
      }

      // Step 3: Map email to account
      const accountMapping = await accountMappingService.mapEmailToAccount(email, parsedTicket);
      
      if (!accountMapping) {
        return {
          success: false,
          error: 'Could not map email to any account',
          warnings,
          processingTime: Date.now() - startTime,
          confidence: parsedTicket.confidence,
          securityResult,
          quarantined
        };
      }

      await this.logProcessingStep(context.integrationId, null, 'ACCOUNT_MAPPED', 'SUCCESS', {
        accountId: accountMapping.account.id,
        accountName: accountMapping.account.name,
        mappingMethod: accountMapping.mappingMethod,
        confidence: accountMapping.confidence
      });

      // Step 4: Check for duplicates
      if (!this.config.allowDuplicateTickets) {
        const duplicate = await this.checkForDuplicateTicket(email, accountMapping.account);
        if (duplicate) {
          warnings.push(`Potential duplicate of ticket #${duplicate.ticketNumber}`);
          
          if (!this.config.allowDuplicateTickets) {
            return {
              success: false,
              error: `Duplicate ticket detected: ${duplicate.ticketNumber}`,
              warnings,
              processingTime: Date.now() - startTime,
              confidence: parsedTicket.confidence,
              securityResult,
              quarantined
            };
          }
        }
      }

      // Step 5: Check permissions
      if (!context.skipPermissionChecks && context.systemUserId) {
        const canCreate = await permissionService.hasPermission({
          userId: context.systemUserId,
          resource: 'tickets',
          action: 'create',
          accountId: accountMapping.account.id
        });

        if (!canCreate) {
          return {
            success: false,
            error: 'Insufficient permissions to create ticket for this account',
            warnings,
            processingTime: Date.now() - startTime,
            confidence: parsedTicket.confidence,
            securityResult,
            quarantined
          };
        }
      }

      // Step 6: Create ticket (if not dry run)
      if (context.dryRun) {
        return {
          success: true,
          warnings,
          processingTime: Date.now() - startTime,
          confidence: parsedTicket.confidence
        };
      }

      const ticketResult = await this.createTicketFromEmail(email, parsedTicket, accountMapping, context);
      
      return {
        ...ticketResult,
        warnings,
        processingTime: Date.now() - startTime,
        confidence: parsedTicket.confidence,
        securityResult,
        quarantined
      };

    } catch (error) {
      await this.logProcessingStep(context.integrationId, null, 'PROCESSING_ERROR', 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        warnings,
        processingTime: Date.now() - startTime,
        confidence: 0,
        securityResult: undefined,
        quarantined: false
      };
    }
  }

  /**
   * Handle reply to existing ticket
   */
  private async handleTicketReply(
    email: EmailMessageData,
    parsedTicket: ParsedTicketData,
    context: EmailProcessingContext,
    startTime: number,
    warnings: string[]
  ): Promise<TicketCreationResult> {
    
    // Find existing ticket
    const existingTicket = await this.findTicketByNumber(parsedTicket.originalTicketNumber!);
    
    if (!existingTicket) {
      warnings.push(`Referenced ticket ${parsedTicket.originalTicketNumber} not found`);
      // Continue as new ticket creation
      return this.processEmail({ ...email }, { ...context });
    }

    // Store email message linked to existing ticket
    const emailMessage = await this.storeEmailMessage(email, context.integrationId, existingTicket.id);

    // Update ticket with reply
    const updatedTicket = await prisma.ticket.update({
      where: { id: existingTicket.id },
      data: {
        status: parsedTicket.status || existingTicket.status,
        updatedAt: new Date()
      }
    });

    await this.logProcessingStep(context.integrationId, emailMessage?.id || null, 'TICKET_REPLY', 'SUCCESS', {
      ticketId: existingTicket.id,
      ticketNumber: existingTicket.ticketNumber
    });

    return {
      success: true,
      ticket: updatedTicket,
      emailMessage: emailMessage || undefined,
      warnings,
      processingTime: Date.now() - startTime,
      confidence: parsedTicket.confidence
    };
  }

  /**
   * Create new ticket from email
   */
  private async createTicketFromEmail(
    email: EmailMessageData,
    parsedTicket: ParsedTicketData,
    accountMapping: AccountMapping,
    context: EmailProcessingContext
  ): Promise<{ success: boolean; ticket?: Ticket; emailMessage?: EmailMessage; error?: string }> {
    
    try {
      return await prisma.$transaction(async (tx) => {
        // Generate ticket number
        const ticketNumber = await this.generateTicketNumber(accountMapping.account);

        // Prepare custom fields
        const customFields = {
          ...parsedTicket.customFields,
          emailSource: email.fromEmail,
          emailMessageId: email.messageId,
          parsingConfidence: parsedTicket.confidence,
          accountMappingMethod: accountMapping.mappingMethod
        };

        // Map custom fields using configuration
        for (const [emailField, ticketField] of Object.entries(this.config.customFieldMappings)) {
          if (parsedTicket.customFields?.[emailField]) {
            customFields[ticketField] = parsedTicket.customFields[emailField];
          }
        }

        // Create ticket
        const ticket = await tx.ticket.create({
          data: {
            ticketNumber,
            title: parsedTicket.subject,
            description: parsedTicket.description,
            status: parsedTicket.status || this.config.defaultTicketStatus,
            priority: parsedTicket.priority || this.config.defaultTicketPriority,
            accountId: accountMapping.account.id,
            assignedAccountUserId: accountMapping.assignedAccountUser?.id,
            creatorId: context.systemUserId,
            customFields
          }
        });

        // Store email message
        const emailMessage = await this.storeEmailMessage(email, context.integrationId, ticket.id, tx);

        await this.logProcessingStep(context.integrationId, emailMessage?.id || null, 'TICKET_CREATED', 'SUCCESS', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          accountId: accountMapping.account.id
        });

        return {
          success: true,
          ticket,
          emailMessage: emailMessage || undefined
        };
      });

    } catch (error) {
      await this.logProcessingStep(context.integrationId, null, 'TICKET_CREATION', 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ticket'
      };
    }
  }

  /**
   * Store email message in database
   */
  private async storeEmailMessage(
    email: EmailMessageData,
    integrationId: string,
    ticketId?: string,
    tx?: any
  ): Promise<EmailMessage | null> {
    
    if (!this.config.storeOriginalEmails) {
      return null;
    }

    const client = tx || prisma;

    try {
      const emailMessage = await client.emailMessage.create({
        data: {
          integrationId,
          messageId: email.messageId,
          threadId: email.threadId,
          inReplyTo: email.inReplyTo,
          ticketId,
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
        }
      });

      // Store attachments
      if (this.config.storeAttachments && email.attachments) {
        await this.storeEmailAttachments(emailMessage.id, email.attachments, client);
      }

      return emailMessage;

    } catch (error) {
      console.error('Failed to store email message:', error);
      return null;
    }
  }

  /**
   * Store email attachments
   */
  private async storeEmailAttachments(
    emailId: string,
    attachments: EmailAttachmentData[],
    client: any
  ): Promise<void> {
    
    for (const attachment of attachments) {
      try {
        // Skip oversized attachments
        if (attachment.size > this.config.maxAttachmentSize) {
          console.warn(`Skipping oversized attachment: ${attachment.filename} (${attachment.size} bytes)`);
          continue;
        }

        await client.emailAttachment.create({
          data: {
            emailId,
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            contentId: attachment.contentId,
            content: attachment.content,
            storagePath: attachment.storagePath,
            securityStatus: 'PENDING'
          }
        });

      } catch (error) {
        console.error(`Failed to store attachment ${attachment.filename}:`, error);
      }
    }
  }

  /**
   * Check for duplicate tickets
   */
  private async checkForDuplicateTicket(email: EmailMessageData, account: Account): Promise<Ticket | null> {
    const cutoffDate = new Date(Date.now() - (this.config.duplicateDetectionWindow * 60 * 60 * 1000));

    // Look for tickets with similar subject in the timeframe
    const similarTickets = await prisma.ticket.findMany({
      where: {
        accountId: account.id,
        createdAt: {
          gte: cutoffDate
        },
        title: {
          contains: email.subject.substring(0, 50) // First 50 characters
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Check for exact subject match or similar content
    for (const ticket of similarTickets) {
      if (this.isTicketDuplicate(email, ticket)) {
        return ticket;
      }
    }

    return null;
  }

  /**
   * Check if ticket is duplicate
   */
  private isTicketDuplicate(email: EmailMessageData, ticket: Ticket): boolean {
    // Exact subject match
    if (email.subject.trim().toLowerCase() === ticket.title.trim().toLowerCase()) {
      return true;
    }

    // Similar subject (Levenshtein distance or simple similarity)
    const similarity = this.calculateStringSimilarity(email.subject, ticket.title);
    if (similarity > 0.8) {
      return true;
    }

    return false;
  }

  /**
   * Simple string similarity calculation
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find ticket by ticket number
   */
  private async findTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
    return await prisma.ticket.findFirst({
      where: {
        ticketNumber: {
          equals: ticketNumber,
          mode: 'insensitive'
        }
      }
    });
  }

  /**
   * Generate ticket number
   */
  private async generateTicketNumber(account: Account): Promise<string> {
    // Get current year
    const year = new Date().getFullYear();
    
    // Create account prefix (first 4 chars of account name, uppercase)
    const accountPrefix = account.name.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
    
    // Get next sequence number for this account/year
    const lastTicket = await prisma.ticket.findFirst({
      where: {
        accountId: account.id,
        ticketNumber: {
          startsWith: `${accountPrefix}-${year}-`
        }
      },
      orderBy: {
        ticketNumber: 'desc'
      }
    });

    let nextSequence = 1;
    if (lastTicket) {
      const match = lastTicket.ticketNumber.match(/-(\d+)$/);
      if (match) {
        nextSequence = parseInt(match[1]) + 1;
      }
    }

    return `${accountPrefix}-${year}-${nextSequence.toString().padStart(4, '0')}`;
  }

  /**
   * Log processing step
   */
  private async logProcessingStep(
    integrationId: string,
    messageId: string | null,
    action: string,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    details?: any,
    errorMessage?: string,
    processingTime?: number
  ): Promise<void> {
    
    if (!this.config.enableDetailedLogging) {
      return;
    }

    try {
      await prisma.emailProcessingLog.create({
        data: {
          integrationId,
          messageId,
          action,
          status,
          details: details || {},
          errorMessage,
          processingTime
        }
      });
    } catch (error) {
      // Don't fail processing due to logging errors
      console.error('Failed to log processing step:', error);
    }
  }

  /**
   * Update workflow configuration
   */
  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(integrationId?: string, since?: Date): Promise<{
    totalProcessed: number;
    successful: number;
    failed: number;
    ticketsCreated: number;
    repliesProcessed: number;
    averageProcessingTime: number;
    averageConfidence: number;
  }> {
    const whereClause: any = {};
    
    if (integrationId) {
      whereClause.integrationId = integrationId;
    }
    
    if (since) {
      whereClause.createdAt = { gte: since };
    }

    const logs = await prisma.emailProcessingLog.findMany({
      where: whereClause,
      select: {
        action: true,
        status: true,
        processingTime: true,
        details: true
      }
    });

    const stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      ticketsCreated: 0,
      repliesProcessed: 0,
      averageProcessingTime: 0,
      averageConfidence: 0
    };

    let totalProcessingTime = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let processingTimeCount = 0;

    for (const log of logs) {
      if (log.action === 'EMAIL_RECEIVED') {
        stats.totalProcessed++;
      }
      
      if (log.status === 'SUCCESS') {
        stats.successful++;
      } else if (log.status === 'FAILED') {
        stats.failed++;
      }
      
      if (log.action === 'TICKET_CREATED') {
        stats.ticketsCreated++;
      }
      
      if (log.action === 'TICKET_REPLY') {
        stats.repliesProcessed++;
      }
      
      if (log.processingTime) {
        totalProcessingTime += log.processingTime;
        processingTimeCount++;
      }
      
      if (log.details?.confidence) {
        totalConfidence += log.details.confidence;
        confidenceCount++;
      }
    }

    stats.averageProcessingTime = processingTimeCount > 0 ? totalProcessingTime / processingTimeCount : 0;
    stats.averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return stats;
  }
}

/**
 * Default workflow instance
 */
export const emailToTicketWorkflow = new EmailToTicketWorkflow();