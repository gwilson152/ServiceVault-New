import { prisma } from '@/lib/prisma';
import { emailThreadingService } from './EmailThreadingService';
import { emailParser, type ParsedTicketData } from './EmailParser';
import type { EmailMessageData } from './providers/EmailProvider';
import type { Ticket, EmailMessage, User, AccountMembership } from '@prisma/client';

/**
 * Reply processing result
 */
export interface ReplyProcessingResult {
  success: boolean;
  ticket?: Ticket;
  emailMessage?: EmailMessage;
  action: 'UPDATED' | 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'IGNORED';
  changes: string[];
  error?: string;
  processingTime: number;
}

/**
 * Reply detection result
 */
export interface ReplyDetection {
  isReply: boolean;
  originalTicket?: Ticket;
  replyType: 'CUSTOMER_REPLY' | 'AGENT_REPLY' | 'SYSTEM_REPLY' | 'UNKNOWN';
  confidence: number;
  detectionMethod: string[];
}

/**
 * Reply processing configuration
 */
export interface ReplyHandlerConfig {
  // Reply detection settings
  enableSubjectMatching: boolean;
  enableHeaderMatching: boolean;
  enableThreadMatching: boolean;
  
  // Action settings
  autoUpdateTicketStatus: boolean;
  autoAssignToReplier: boolean;
  addRepliesAsComments: boolean;
  
  // Status transition rules
  statusTransitions: {
    fromStatus: string;
    toStatus: string;
    condition: 'CUSTOMER_REPLY' | 'AGENT_REPLY' | 'ANY_REPLY';
  }[];
  
  // Priority handling
  updatePriorityFromReply: boolean;
  escalateOnCustomerReply: boolean;
  
  // Content processing
  includeQuotedContent: boolean;
  maxCommentLength: number;
  
  // Security settings
  requireSenderVerification: boolean;
  allowExternalReplies: boolean;
}

/**
 * Default reply handler configuration
 */
const DEFAULT_REPLY_CONFIG: ReplyHandlerConfig = {
  enableSubjectMatching: true,
  enableHeaderMatching: true,
  enableThreadMatching: true,
  
  autoUpdateTicketStatus: true,
  autoAssignToReplier: false,
  addRepliesAsComments: true,
  
  statusTransitions: [
    { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', condition: 'CUSTOMER_REPLY' },
    { fromStatus: 'WAITING', toStatus: 'IN_PROGRESS', condition: 'CUSTOMER_REPLY' },
    { fromStatus: 'IN_PROGRESS', toStatus: 'WAITING', condition: 'AGENT_REPLY' }
  ],
  
  updatePriorityFromReply: true,
  escalateOnCustomerReply: false,
  
  includeQuotedContent: false,
  maxCommentLength: 5000,
  
  requireSenderVerification: true,
  allowExternalReplies: true
};

/**
 * Email reply handler service
 * Processes email replies and updates existing tickets
 */
export class EmailReplyHandler {
  private config: ReplyHandlerConfig;

  constructor(config?: Partial<ReplyHandlerConfig>) {
    this.config = { ...DEFAULT_REPLY_CONFIG, ...config };
  }

  /**
   * Process email reply and update ticket
   */
  async processReply(
    email: EmailMessageData,
    integrationId: string
  ): Promise<ReplyProcessingResult> {
    const startTime = Date.now();
    const changes: string[] = [];

    try {
      // Step 1: Detect if this is a reply to an existing ticket
      const replyDetection = await this.detectReply(email);

      if (!replyDetection.isReply || !replyDetection.originalTicket) {
        return {
          success: false,
          action: 'IGNORED',
          changes: [],
          error: 'Not a reply to existing ticket',
          processingTime: Date.now() - startTime
        };
      }

      const ticket = replyDetection.originalTicket;

      // Step 2: Verify sender permissions
      if (this.config.requireSenderVerification) {
        const senderVerification = await this.verifySender(email, ticket);
        if (!senderVerification.isAuthorized) {
          return {
            success: false,
            action: 'IGNORED',
            changes: [],
            error: `Sender not authorized: ${senderVerification.reason}`,
            processingTime: Date.now() - startTime
          };
        }
      }

      // Step 3: Parse reply content
      const parsedReply = await emailParser.parseEmail(email);

      // Step 4: Store email message linked to ticket
      const emailMessage = await this.storeReplyEmail(email, ticket.id, integrationId);

      // Step 5: Process reply based on type and configuration
      let action: ReplyProcessingResult['action'] = 'COMMENT_ADDED';
      let updatedTicket = ticket;

      // Add reply as comment/update
      if (this.config.addRepliesAsComments) {
        await this.addReplyAsComment(ticket, parsedReply, email, replyDetection.replyType);
        changes.push('Added reply as comment');
      }

      // Update ticket status based on reply type
      if (this.config.autoUpdateTicketStatus) {
        const statusUpdate = await this.updateTicketStatus(ticket, replyDetection.replyType);
        if (statusUpdate.changed) {
          updatedTicket = statusUpdate.ticket;
          changes.push(`Status changed: ${ticket.status} → ${statusUpdate.ticket.status}`);
          action = 'STATUS_CHANGED';
        }
      }

      // Update priority if configured
      if (this.config.updatePriorityFromReply && parsedReply.priority !== 'MEDIUM') {
        const priorityUpdate = await this.updateTicketPriority(updatedTicket, parsedReply.priority);
        if (priorityUpdate.changed) {
          updatedTicket = priorityUpdate.ticket;
          changes.push(`Priority changed: ${ticket.priority} → ${parsedReply.priority}`);
        }
      }

      // Auto-assign if configured
      if (this.config.autoAssignToReplier && replyDetection.replyType === 'AGENT_REPLY') {
        const assignmentUpdate = await this.autoAssignTicket(updatedTicket, email);
        if (assignmentUpdate.changed) {
          updatedTicket = assignmentUpdate.ticket;
          changes.push(`Assigned to: ${assignmentUpdate.assigneeName}`);
          action = 'ASSIGNED';
        }
      }

      // Update email threading
      await emailThreadingService.threadMessage(email, emailMessage);
      changes.push('Updated email thread');

      // Final ticket update (timestamp)
      updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() }
      });

      return {
        success: true,
        ticket: updatedTicket,
        emailMessage,
        action,
        changes,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        action: 'IGNORED',
        changes,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Detect if email is a reply to existing ticket
   */
  async detectReply(email: EmailMessageData): Promise<ReplyDetection> {
    const detectionMethods: string[] = [];
    let originalTicket: Ticket | null = null;
    let confidence = 0;

    // Method 1: Header-based detection (In-Reply-To, References)
    if (this.config.enableHeaderMatching && (email.inReplyTo || email.headers?.['references'])) {
      const headerTicket = await this.findTicketByHeaders(email);
      if (headerTicket) {
        originalTicket = headerTicket;
        confidence += 40;
        detectionMethods.push('header_matching');
      }
    }

    // Method 2: Thread-based detection
    if (this.config.enableThreadMatching && email.threadId) {
      const threadTicket = await this.findTicketByThread(email.threadId);
      if (threadTicket) {
        originalTicket = threadTicket;
        confidence += 35;
        detectionMethods.push('thread_matching');
      }
    }

    // Method 3: Subject-based detection
    if (this.config.enableSubjectMatching && !originalTicket) {
      const subjectTicket = await this.findTicketBySubject(email.subject);
      if (subjectTicket) {
        originalTicket = subjectTicket;
        confidence += 25;
        detectionMethods.push('subject_matching');
      }
    }

    // Determine reply type
    let replyType: ReplyDetection['replyType'] = 'UNKNOWN';
    
    if (originalTicket) {
      replyType = await this.determineReplyType(email, originalTicket);
      
      // Boost confidence based on reply type detection
      if (replyType !== 'UNKNOWN') {
        confidence += 15;
      }
    }

    return {
      isReply: !!originalTicket && confidence >= 50,
      originalTicket: originalTicket || undefined,
      replyType,
      confidence,
      detectionMethod: detectionMethods
    };
  }

  /**
   * Find ticket by email headers
   */
  private async findTicketByHeaders(email: EmailMessageData): Promise<Ticket | null> {
    const messageIds: string[] = [];

    if (email.inReplyTo) {
      messageIds.push(email.inReplyTo);
    }

    if (email.headers?.['references']) {
      const references = email.headers['references']
        .match(/<[^>]+>/g)
        ?.map(id => id.slice(1, -1)) || [];
      messageIds.push(...references);
    }

    if (messageIds.length === 0) {
      return null;
    }

    // Find email message that matches one of these IDs
    const relatedMessage = await prisma.emailMessage.findFirst({
      where: {
        messageId: { in: messageIds },
        ticketId: { not: null }
      },
      include: {
        ticket: true
      }
    });

    return relatedMessage?.ticket || null;
  }

  /**
   * Find ticket by thread ID
   */
  private async findTicketByThread(threadId: string): Promise<Ticket | null> {
    const thread = await emailThreadingService.getThread(threadId);
    
    if (thread && thread.ticketId) {
      return await prisma.ticket.findUnique({
        where: { id: thread.ticketId }
      });
    }

    return null;
  }

  /**
   * Find ticket by subject matching
   */
  private async findTicketBySubject(subject: string): Promise<Ticket | null> {
    // Extract ticket number patterns from subject
    const ticketPatterns = [
      /\b([A-Z]{2,}-\d{4}-\d{4})\b/g, // ACME-2024-0001
      /\b(TKT|TICKET)\s*#?\s*(\d+)\b/gi, // TKT #123
      /\b#(\d{6,})\b/g // #123456
    ];

    for (const pattern of ticketPatterns) {
      const matches = subject.match(pattern);
      if (matches) {
        for (const match of matches) {
          const ticket = await prisma.ticket.findFirst({
            where: {
              ticketNumber: {
                equals: match.replace(/[#\s]/g, ''),
                mode: 'insensitive'
              }
            }
          });
          
          if (ticket) {
            return ticket;
          }
        }
      }
    }

    return null;
  }

  /**
   * Determine reply type based on sender and ticket context
   */
  private async determineReplyType(
    email: EmailMessageData, 
    ticket: Ticket
  ): Promise<ReplyDetection['replyType']> {
    
    // Check if sender is the assignee (agent)
    if (ticket.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: ticket.assigneeId }
      });
      
      if (assignee && assignee.email?.toLowerCase() === email.fromEmail.toLowerCase()) {
        return 'AGENT_REPLY';
      }
    }

    // Check if sender is a system user (employee/staff)
    const senderUser = await prisma.user.findUnique({
      where: { email: email.fromEmail.toLowerCase() },
      include: {
        systemRoles: true,
        memberships: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (senderUser) {
      // Check if user has agent/staff permissions
      const hasStaffRole = senderUser.systemRoles.length > 0 || 
        senderUser.memberships.some(m => 
          m.roles.some(r => r.role.permissions.includes('tickets:assign'))
        );
      
      if (hasStaffRole) {
        return 'AGENT_REPLY';
      }
    }

    // Check if sender is the customer (assigned account user)
    if (ticket.assignedAccountUserId) {
      const assignedUser = await prisma.accountMembership.findUnique({
        where: { id: ticket.assignedAccountUserId },
        include: { user: true }
      });
      
      if (assignedUser?.user.email?.toLowerCase() === email.fromEmail.toLowerCase()) {
        return 'CUSTOMER_REPLY';
      }
    }

    // Check if sender is from the same account domain
    const ticketAccount = await prisma.account.findUnique({
      where: { id: ticket.accountId }
    });

    if (ticketAccount?.domains) {
      const senderDomain = email.fromEmail.split('@')[1]?.toLowerCase();
      const accountDomains = ticketAccount.domains.split(',').map(d => d.trim().toLowerCase());
      
      if (accountDomains.includes(senderDomain)) {
        return 'CUSTOMER_REPLY';
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Verify sender authorization
   */
  private async verifySender(
    email: EmailMessageData, 
    ticket: Ticket
  ): Promise<{ isAuthorized: boolean; reason?: string }> {
    
    // Always allow if external replies are enabled
    if (this.config.allowExternalReplies) {
      return { isAuthorized: true };
    }

    // Check if sender is associated with the ticket's account
    const ticketAccount = await prisma.account.findUnique({
      where: { id: ticket.accountId }
    });

    if (!ticketAccount) {
      return { isAuthorized: false, reason: 'Ticket account not found' };
    }

    // Check if sender is a user in the account
    const accountMember = await prisma.accountMembership.findFirst({
      where: {
        accountId: ticket.accountId,
        user: {
          email: email.fromEmail.toLowerCase()
        }
      }
    });

    if (accountMember) {
      return { isAuthorized: true };
    }

    // Check domain matching
    if (ticketAccount.domains) {
      const senderDomain = email.fromEmail.split('@')[1]?.toLowerCase();
      const accountDomains = ticketAccount.domains.split(',').map(d => d.trim().toLowerCase());
      
      if (accountDomains.includes(senderDomain)) {
        return { isAuthorized: true };
      }
    }

    return { 
      isAuthorized: false, 
      reason: 'Sender not associated with ticket account' 
    };
  }

  /**
   * Store reply email message
   */
  private async storeReplyEmail(
    email: EmailMessageData,
    ticketId: string,
    integrationId: string
  ): Promise<EmailMessage> {
    
    return await prisma.emailMessage.create({
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
  }

  /**
   * Add reply as ticket comment/update
   */
  private async addReplyAsComment(
    ticket: Ticket,
    parsedReply: ParsedTicketData,
    email: EmailMessageData,
    replyType: ReplyDetection['replyType']
  ): Promise<void> {
    
    let content = parsedReply.description;
    
    // Limit content length
    if (content.length > this.config.maxCommentLength) {
      content = content.substring(0, this.config.maxCommentLength) + '...';
    }

    // Remove quoted content if configured
    if (!this.config.includeQuotedContent) {
      content = this.removeQuotedContent(content);
    }

    // Add reply metadata to ticket's custom fields or description
    const replyMetadata = {
      type: 'email_reply',
      replyType,
      sender: email.fromEmail,
      senderName: email.fromName,
      timestamp: new Date().toISOString(),
      messageId: email.messageId
    };

    // Update ticket description with reply (simple approach)
    const updatedDescription = `${ticket.description}\n\n--- Reply from ${email.fromName || email.fromEmail} ---\n${content}`;

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        description: updatedDescription,
        customFields: {
          ...(ticket.customFields as any || {}),
          lastReply: replyMetadata
        }
      }
    });
  }

  /**
   * Update ticket status based on reply type
   */
  private async updateTicketStatus(
    ticket: Ticket,
    replyType: ReplyDetection['replyType']
  ): Promise<{ changed: boolean; ticket: Ticket }> {
    
    const applicableTransitions = this.config.statusTransitions.filter(t => 
      t.fromStatus === ticket.status && 
      (t.condition === replyType || t.condition === 'ANY_REPLY')
    );

    if (applicableTransitions.length === 0) {
      return { changed: false, ticket };
    }

    // Use the first matching transition
    const transition = applicableTransitions[0];
    
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: transition.toStatus }
    });

    return { changed: true, ticket: updatedTicket };
  }

  /**
   * Update ticket priority based on reply
   */
  private async updateTicketPriority(
    ticket: Ticket,
    newPriority: string
  ): Promise<{ changed: boolean; ticket: Ticket }> {
    
    if (ticket.priority === newPriority) {
      return { changed: false, ticket };
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { priority: newPriority }
    });

    return { changed: true, ticket: updatedTicket };
  }

  /**
   * Auto-assign ticket to replier
   */
  private async autoAssignTicket(
    ticket: Ticket,
    email: EmailMessageData
  ): Promise<{ changed: boolean; ticket: Ticket; assigneeName?: string }> {
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.fromEmail.toLowerCase() }
    });

    if (!user || ticket.assigneeId === user.id) {
      return { changed: false, ticket };
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { assigneeId: user.id }
    });

    return { 
      changed: true, 
      ticket: updatedTicket, 
      assigneeName: user.name || user.email 
    };
  }

  /**
   * Remove quoted content from reply
   */
  private removeQuotedContent(content: string): string {
    // Remove lines starting with >
    content = content.replace(/^>.*$/gm, '');
    
    // Remove common quote patterns
    content = content.replace(/On .* wrote:/g, '');
    content = content.replace(/From:.*Sent:.*To:.*Subject:.*/gs, '');
    
    // Remove excess whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return content;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReplyHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReplyHandlerConfig {
    return { ...this.config };
  }

  /**
   * Get reply processing statistics
   */
  async getStats(since?: Date): Promise<{
    totalReplies: number;
    customerReplies: number;
    agentReplies: number;
    statusUpdates: number;
    assignmentChanges: number;
    averageProcessingTime: number;
  }> {
    
    const whereClause: any = {
      action: 'TICKET_REPLY'
    };
    
    if (since) {
      whereClause.createdAt = { gte: since };
    }

    const logs = await prisma.emailProcessingLog.findMany({
      where: whereClause,
      select: {
        details: true,
        processingTime: true
      }
    });

    const stats = {
      totalReplies: logs.length,
      customerReplies: 0,
      agentReplies: 0,
      statusUpdates: 0,
      assignmentChanges: 0,
      averageProcessingTime: 0
    };

    let totalProcessingTime = 0;

    for (const log of logs) {
      const details = log.details as any;
      
      if (details.replyType === 'CUSTOMER_REPLY') {
        stats.customerReplies++;
      } else if (details.replyType === 'AGENT_REPLY') {
        stats.agentReplies++;
      }
      
      if (details.changes?.includes('Status changed')) {
        stats.statusUpdates++;
      }
      
      if (details.changes?.includes('Assigned to')) {
        stats.assignmentChanges++;
      }
      
      if (log.processingTime) {
        totalProcessingTime += log.processingTime;
      }
    }

    stats.averageProcessingTime = logs.length > 0 ? totalProcessingTime / logs.length : 0;

    return stats;
  }
}

/**
 * Default email reply handler instance
 */
export const emailReplyHandler = new EmailReplyHandler();