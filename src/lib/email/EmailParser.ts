import type { EmailMessageData, EmailAttachmentData } from './providers/EmailProvider';
import type { Account } from '@prisma/client';

/**
 * Parsed ticket data extracted from email
 */
export interface ParsedTicketData {
  // Basic ticket information
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  
  // Customer information
  customerEmail: string;
  customerName?: string;
  
  // Parsing metadata
  confidence: number; // 0-100 confidence score
  extractionMethod: string; // How the data was extracted
  
  // Optional extracted fields
  ticketType?: string;
  category?: string;
  dueDate?: Date;
  customFields?: Record<string, any>;
  
  // Email threading
  isReply: boolean;
  originalTicketNumber?: string;
  referencedMessageId?: string;
  
  // Attachments
  attachments: EmailAttachmentData[];
  
  // Raw email data for reference
  originalEmail: EmailMessageData;
}

/**
 * Email parsing configuration
 */
export interface EmailParsingConfig {
  // Ticket detection patterns
  ticketPatterns: {
    subjectPrefixes: string[]; // e.g., ['[TICKET]', 'Support:', 'Help:']
    replyPatterns: string[]; // e.g., ['Re:', 'RE:', 'Fw:', 'FW:']
    ticketNumberPatterns: RegExp[]; // e.g., [/TICKET-\d+/, /TKT\d+/]
  };
  
  // Priority detection
  priorityKeywords: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  
  // Content extraction settings
  contentLimits: {
    maxDescriptionLength: number;
    maxAttachmentSize: number;
    allowedAttachmentTypes: string[];
  };
  
  // Auto-categorization
  categoryKeywords: Record<string, string[]>;
  
  // Custom field extraction
  customFieldPatterns: Record<string, RegExp>;
}

/**
 * Default email parsing configuration
 */
const DEFAULT_PARSING_CONFIG: EmailParsingConfig = {
  ticketPatterns: {
    subjectPrefixes: ['[TICKET]', '[SUPPORT]', 'Support:', 'Help:', 'Issue:', 'Request:', 'Bug:', 'Feature:'],
    replyPatterns: ['Re:', 'RE:', 'Fw:', 'FW:', 'Fwd:', 'Reply:', 'Response:'],
    ticketNumberPatterns: [
      /\b[A-Z]{2,}-\d+\b/g, // ACME-123, SUPPORT-456
      /\b(TICKET|TKT|ISSUE|INC)\s*#?\s*\d+\b/gi, // TICKET 123, TKT#456
      /\b#\d{3,}\b/g // #12345
    ]
  },
  
  priorityKeywords: {
    critical: ['urgent', 'critical', 'emergency', 'down', 'outage', 'broken', 'asap', 'immediately'],
    high: ['important', 'high', 'priority', 'soon', 'quickly', 'escalate'],
    medium: ['normal', 'standard', 'regular', 'moderate'],
    low: ['low', 'minor', 'small', 'enhancement', 'suggestion', 'when possible']
  },
  
  contentLimits: {
    maxDescriptionLength: 10000,
    maxAttachmentSize: 25 * 1024 * 1024, // 25MB
    allowedAttachmentTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip', 'application/x-zip-compressed'
    ]
  },
  
  categoryKeywords: {
    'Technical Support': ['error', 'bug', 'crash', 'not working', 'broken', 'technical', 'system'],
    'Account Issues': ['login', 'password', 'account', 'access', 'permission', 'user'],
    'Billing': ['payment', 'invoice', 'billing', 'charge', 'refund', 'subscription'],
    'Feature Request': ['feature', 'enhancement', 'suggestion', 'improve', 'add', 'new'],
    'General Inquiry': ['question', 'how to', 'information', 'help', 'guide', 'documentation']
  },
  
  customFieldPatterns: {
    phone: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    orderNumber: /\b(order|order\s*#|order\s*number)[:\s]*([A-Z0-9-]{6,})/gi,
    productVersion: /\b(version|ver|v\.?)\s*([0-9]+(?:\.[0-9]+)*)/gi
  }
};

/**
 * Email parsing service to extract ticket information from emails
 */
export class EmailParser {
  private config: EmailParsingConfig;

  constructor(config?: Partial<EmailParsingConfig>) {
    this.config = this.mergeConfig(DEFAULT_PARSING_CONFIG, config || {});
  }

  /**
   * Parse email and extract ticket data
   */
  async parseEmail(email: EmailMessageData): Promise<ParsedTicketData> {
    let confidence = 0;
    const extractionMethods: string[] = [];

    // Determine if this is a reply to an existing ticket
    const replyInfo = this.detectReply(email);
    
    // Extract basic ticket information
    const subject = this.extractSubject(email.subject);
    const description = this.extractDescription(email);
    const priority = this.detectPriority(email);
    const category = this.detectCategory(email);
    
    // Process attachments
    const processedAttachments = this.processAttachments(email.attachments || []);
    
    // Extract custom fields
    const customFields = this.extractCustomFields(email);
    
    // Calculate confidence score
    confidence = this.calculateConfidence(email, {
      hasSubject: !!subject,
      hasDescription: !!description,
      hasValidSender: !!email.fromEmail,
      isReply: replyInfo.isReply,
      hasAttachments: processedAttachments.length > 0,
      detectedPriority: priority !== 'MEDIUM',
      detectedCategory: !!category
    });

    // Determine extraction methods used
    if (replyInfo.isReply) extractionMethods.push('reply_detection');
    if (priority !== 'MEDIUM') extractionMethods.push('priority_detection');
    if (category) extractionMethods.push('category_detection');
    if (Object.keys(customFields).length > 0) extractionMethods.push('custom_fields');
    if (processedAttachments.length > 0) extractionMethods.push('attachment_processing');

    return {
      subject,
      description,
      priority,
      status: replyInfo.isReply ? 'IN_PROGRESS' : 'OPEN',
      customerEmail: email.fromEmail,
      customerName: email.fromName,
      confidence,
      extractionMethod: extractionMethods.join(', ') || 'basic_parsing',
      ticketType: category || 'General',
      category,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      isReply: replyInfo.isReply,
      originalTicketNumber: replyInfo.ticketNumber,
      referencedMessageId: replyInfo.referencedMessageId,
      attachments: processedAttachments,
      originalEmail: email
    };
  }

  /**
   * Detect if email is a reply to existing ticket
   */
  private detectReply(email: EmailMessageData): {
    isReply: boolean;
    ticketNumber?: string;
    referencedMessageId?: string;
  } {
    // Check subject for reply indicators
    const subject = email.subject.toLowerCase();
    const isReplySubject = this.config.ticketPatterns.replyPatterns.some(pattern =>
      subject.startsWith(pattern.toLowerCase())
    );

    // Look for ticket numbers in subject or body
    let ticketNumber: string | undefined;
    const content = `${email.subject} ${email.textBody || email.htmlBody || ''}`;
    
    for (const pattern of this.config.ticketPatterns.ticketNumberPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        ticketNumber = matches[0].trim();
        break;
      }
    }

    // Check for In-Reply-To header
    const referencedMessageId = email.inReplyTo;

    return {
      isReply: isReplySubject || !!ticketNumber || !!referencedMessageId,
      ticketNumber,
      referencedMessageId
    };
  }

  /**
   * Extract clean subject line
   */
  private extractSubject(rawSubject: string): string {
    if (!rawSubject) return 'No Subject';

    let subject = rawSubject.trim();

    // Remove reply prefixes
    for (const prefix of this.config.ticketPatterns.replyPatterns) {
      if (subject.toLowerCase().startsWith(prefix.toLowerCase())) {
        subject = subject.substring(prefix.length).trim();
        break;
      }
    }

    // Remove ticket prefixes
    for (const prefix of this.config.ticketPatterns.subjectPrefixes) {
      if (subject.toLowerCase().startsWith(prefix.toLowerCase())) {
        subject = subject.substring(prefix.length).trim();
        break;
      }
    }

    // Clean up extra whitespace and common artifacts
    subject = subject
      .replace(/\s+/g, ' ')
      .replace(/^[:\-\s]+/, '')
      .trim();

    return subject || 'No Subject';
  }

  /**
   * Extract description from email body
   */
  private extractDescription(email: EmailMessageData): string {
    let description = '';

    // Prefer plain text, fall back to HTML
    if (email.textBody) {
      description = email.textBody;
    } else if (email.htmlBody) {
      description = this.stripHtml(email.htmlBody);
    } else {
      description = email.subject || 'No description available';
    }

    // Clean up the description
    description = this.cleanDescription(description);

    // Limit length
    if (description.length > this.config.contentLimits.maxDescriptionLength) {
      description = description.substring(0, this.config.contentLimits.maxDescriptionLength) + '...';
    }

    return description || 'No description provided';
  }

  /**
   * Detect priority from email content
   */
  private detectPriority(email: EmailMessageData): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const content = `${email.subject} ${email.textBody || email.htmlBody || ''}`.toLowerCase();

    // Check for priority keywords
    for (const [priority, keywords] of Object.entries(this.config.priorityKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          return priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        }
      }
    }

    // Check email priority header
    if (email.priority !== undefined) {
      if (email.priority <= 2) return 'CRITICAL';
      if (email.priority <= 3) return 'HIGH';
      if (email.priority >= 7) return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Detect category from email content
   */
  private detectCategory(email: EmailMessageData): string | undefined {
    const content = `${email.subject} ${email.textBody || email.htmlBody || ''}`.toLowerCase();

    for (const [category, keywords] of Object.entries(this.config.categoryKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          return category;
        }
      }
    }

    return undefined;
  }

  /**
   * Process and validate attachments
   */
  private processAttachments(attachments: EmailAttachmentData[]): EmailAttachmentData[] {
    return attachments.filter(attachment => {
      // Check file size
      if (attachment.size > this.config.contentLimits.maxAttachmentSize) {
        console.warn(`Attachment ${attachment.filename} too large: ${attachment.size} bytes`);
        return false;
      }

      // Check content type
      if (!this.config.contentLimits.allowedAttachmentTypes.includes(attachment.contentType)) {
        console.warn(`Attachment ${attachment.filename} type not allowed: ${attachment.contentType}`);
        return false;
      }

      // Check filename for suspicious patterns
      if (this.isSuspiciousFilename(attachment.filename)) {
        console.warn(`Attachment ${attachment.filename} has suspicious filename`);
        return false;
      }

      return true;
    });
  }

  /**
   * Extract custom fields using configured patterns
   */
  private extractCustomFields(email: EmailMessageData): Record<string, any> {
    const customFields: Record<string, any> = {};
    const content = `${email.subject} ${email.textBody || email.htmlBody || ''}`;

    for (const [fieldName, pattern] of Object.entries(this.config.customFieldPatterns)) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Store the first meaningful match (skip full match if it includes capture groups)
        customFields[fieldName] = matches.length > 1 ? matches.slice(1).join(' ') : matches[0];
      }
    }

    return customFields;
  }

  /**
   * Calculate confidence score for parsing
   */
  private calculateConfidence(email: EmailMessageData, factors: {
    hasSubject: boolean;
    hasDescription: boolean;
    hasValidSender: boolean;
    isReply: boolean;
    hasAttachments: boolean;
    detectedPriority: boolean;
    detectedCategory: boolean;
  }): number {
    let score = 0;

    // Base scoring
    if (factors.hasSubject) score += 20;
    if (factors.hasDescription) score += 25;
    if (factors.hasValidSender) score += 20;

    // Bonus points for additional detection
    if (factors.isReply) score += 10;
    if (factors.hasAttachments) score += 5;
    if (factors.detectedPriority) score += 10;
    if (factors.detectedCategory) score += 10;

    // Ensure valid email structure
    if (email.fromEmail && email.subject) {
      score = Math.max(score, 50); // Minimum 50 for valid emails
    }

    return Math.min(score, 100);
  }

  /**
   * Strip HTML tags and decode entities
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean up description text
   */
  private cleanDescription(description: string): string {
    return description
      // Remove email signature patterns
      .replace(/\n--\s*\n[\s\S]*$/g, '')
      .replace(/\nSent from my \w+\s*$/gi, '')
      .replace(/\nGet Outlook for \w+\s*$/gi, '')
      // Remove quote blocks (> prefixed lines)
      .replace(/^>.*$/gm, '')
      // Remove empty lines and normalize spacing
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
  }

  /**
   * Check if filename is suspicious
   */
  private isSuspiciousFilename(filename: string): boolean {
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(defaultConfig: EmailParsingConfig, userConfig: Partial<EmailParsingConfig>): EmailParsingConfig {
    return {
      ticketPatterns: {
        ...defaultConfig.ticketPatterns,
        ...userConfig.ticketPatterns
      },
      priorityKeywords: {
        ...defaultConfig.priorityKeywords,
        ...userConfig.priorityKeywords
      },
      contentLimits: {
        ...defaultConfig.contentLimits,
        ...userConfig.contentLimits
      },
      categoryKeywords: {
        ...defaultConfig.categoryKeywords,
        ...userConfig.categoryKeywords
      },
      customFieldPatterns: {
        ...defaultConfig.customFieldPatterns,
        ...userConfig.customFieldPatterns
      }
    };
  }

  /**
   * Update parsing configuration
   */
  updateConfig(config: Partial<EmailParsingConfig>): void {
    this.config = this.mergeConfig(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): EmailParsingConfig {
    return { ...this.config };
  }

  /**
   * Validate email for parsing
   */
  validateEmail(email: EmailMessageData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email.fromEmail) {
      errors.push('Missing sender email address');
    }

    if (!email.subject && !email.textBody && !email.htmlBody) {
      errors.push('Email has no content (no subject, body, or HTML)');
    }

    if (email.fromEmail && !this.isValidEmail(email.fromEmail)) {
      errors.push('Invalid sender email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Default email parser instance
 */
export const emailParser = new EmailParser();