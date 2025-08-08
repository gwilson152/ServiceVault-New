import { prisma } from '@/lib/prisma';
import type { EmailMessageData } from './providers/EmailProvider';

/**
 * Security check result
 */
export interface SecurityCheckResult {
  isSecure: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0-100, higher is more suspicious
  threats: string[];
  warnings: string[];
  blockedReasons?: string[];
  sanitizedContent?: {
    textBody?: string;
    htmlBody?: string;
    subject?: string;
  };
}

/**
 * Attachment security check result
 */
export interface AttachmentSecurityResult {
  filename: string;
  isSecure: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threats: string[];
  warnings: string[];
  allowDownload: boolean;
  quarantined: boolean;
  fileType: string;
  fileSize: number;
}

/**
 * Email security configuration
 */
export interface EmailSecurityConfig {
  // Spam filtering
  enableSpamFiltering: boolean;
  spamThreshold: number; // 0-100
  spamQuarantineThreshold: number;
  
  // Content scanning
  enableContentScanning: boolean;
  scanAttachments: boolean;
  maxAttachmentSize: number; // bytes
  
  // Blocked file types
  blockedFileTypes: string[];
  quarantineFileTypes: string[];
  
  // URL scanning
  enableUrlScanning: boolean;
  urlScanTimeout: number; // milliseconds
  
  // Sender reputation
  enableSenderReputation: boolean;
  reputationThreshold: number;
  
  // Content filtering
  enableContentFiltering: boolean;
  suspiciousPatterns: string[];
  
  // Action settings
  autoQuarantineSuspicious: boolean;
  autoDeleteMalicious: boolean;
  notifyAdminOnThreats: boolean;
  
  // Whitelist/Blacklist
  whitelistedDomains: string[];
  whitelistedSenders: string[];
  blacklistedDomains: string[];
  blacklistedSenders: string[];
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: EmailSecurityConfig = {
  enableSpamFiltering: true,
  spamThreshold: 75,
  spamQuarantineThreshold: 90,
  
  enableContentScanning: true,
  scanAttachments: true,
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  
  blockedFileTypes: ['exe', 'scr', 'bat', 'cmd', 'com', 'pif', 'vbs', 'js', 'jar'],
  quarantineFileTypes: ['zip', 'rar', '7z', 'tar', 'gz'],
  
  enableUrlScanning: true,
  urlScanTimeout: 5000,
  
  enableSenderReputation: true,
  reputationThreshold: 40,
  
  enableContentFiltering: true,
  suspiciousPatterns: [
    'urgent.*action.*required',
    'verify.*account.*immediately',
    'suspended.*account',
    'click.*here.*now',
    'limited.*time.*offer',
    'congratulations.*winner',
    'nigerian.*prince',
    'transfer.*million.*dollars'
  ],
  
  autoQuarantineSuspicious: true,
  autoDeleteMalicious: false,
  notifyAdminOnThreats: true,
  
  whitelistedDomains: [],
  whitelistedSenders: [],
  blacklistedDomains: ['tempmail.org', '10minutemail.com', 'guerrillamail.com'],
  blacklistedSenders: []
};

/**
 * Email security service
 * Provides spam filtering, attachment scanning, and security validation
 */
export class EmailSecurityService {
  private config: EmailSecurityConfig;

  constructor(config?: Partial<EmailSecurityConfig>) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Perform comprehensive security check on email
   */
  async checkEmailSecurity(
    email: EmailMessageData,
    integrationId: string
  ): Promise<SecurityCheckResult> {
    const threats: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let riskLevel: SecurityCheckResult['riskLevel'] = 'LOW';

    try {
      // 1. Check whitelist/blacklist
      const listCheck = this.checkSenderLists(email);
      if (listCheck.blocked) {
        threats.push(...listCheck.reasons);
        score += 50;
      }
      if (listCheck.warnings.length > 0) {
        warnings.push(...listCheck.warnings);
        score += 10;
      }

      // 2. Spam filtering
      if (this.config.enableSpamFiltering) {
        const spamCheck = await this.checkSpam(email);
        score += spamCheck.score;
        
        if (spamCheck.isSpam) {
          threats.push('Identified as spam');
        }
        
        warnings.push(...spamCheck.warnings);
      }

      // 3. Content scanning
      if (this.config.enableContentScanning) {
        const contentCheck = this.scanContent(email);
        score += contentCheck.score;
        threats.push(...contentCheck.threats);
        warnings.push(...contentCheck.warnings);
      }

      // 4. URL scanning
      if (this.config.enableUrlScanning) {
        const urlCheck = await this.scanUrls(email);
        score += urlCheck.score;
        threats.push(...urlCheck.threats);
        warnings.push(...urlCheck.warnings);
      }

      // 5. Sender reputation
      if (this.config.enableSenderReputation) {
        const reputationCheck = await this.checkSenderReputation(email);
        score += reputationCheck.score;
        
        if (reputationCheck.lowReputation) {
          warnings.push('Sender has low reputation');
        }
      }

      // 6. Attachment scanning
      if (this.config.scanAttachments && email.attachments?.length) {
        const attachmentCheck = await this.scanAttachments(email.attachments);
        score += attachmentCheck.totalScore;
        threats.push(...attachmentCheck.threats);
        warnings.push(...attachmentCheck.warnings);
      }

      // Determine risk level
      if (score >= 80) {
        riskLevel = 'CRITICAL';
      } else if (score >= 60) {
        riskLevel = 'HIGH';
      } else if (score >= 30) {
        riskLevel = 'MEDIUM';
      }

      // Log security check
      await this.logSecurityCheck(email, integrationId, {
        score,
        riskLevel,
        threats,
        warnings
      });

      return {
        isSecure: score < this.config.spamThreshold,
        riskLevel,
        score,
        threats,
        warnings,
        blockedReasons: threats,
        sanitizedContent: this.sanitizeContent(email)
      };

    } catch (error) {
      console.error('Security check error:', error);
      
      return {
        isSecure: false,
        riskLevel: 'HIGH',
        score: 75,
        threats: ['Security check failed - treating as suspicious'],
        warnings: [`Error during security check: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Check sender against whitelists and blacklists
   */
  private checkSenderLists(email: EmailMessageData): {
    blocked: boolean;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const senderEmail = email.fromEmail.toLowerCase();
    const senderDomain = senderEmail.split('@')[1];

    // Check whitelist first
    if (this.config.whitelistedSenders.includes(senderEmail) ||
        this.config.whitelistedDomains.includes(senderDomain)) {
      return { blocked: false, reasons: [], warnings: [] };
    }

    // Check blacklist
    if (this.config.blacklistedSenders.includes(senderEmail)) {
      reasons.push('Sender email is blacklisted');
    }

    if (this.config.blacklistedDomains.includes(senderDomain)) {
      reasons.push('Sender domain is blacklisted');
    }

    // Check for suspicious domains
    if (this.isSuspiciousDomain(senderDomain)) {
      warnings.push('Sender domain appears suspicious');
    }

    return {
      blocked: reasons.length > 0,
      reasons,
      warnings
    };
  }

  /**
   * Check if domain is suspicious
   */
  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousPatterns = [
      /\d{5,}/, // Domains with many consecutive numbers
      /[a-z]\d+[a-z]\d+/, // Mixed letters and numbers
      /-{2,}/, // Multiple consecutive hyphens
      /^[a-z]{1,3}\./, // Very short subdomains
      /\.(tk|ml|ga|cf)$/ // Free domains
    ];

    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Spam detection using pattern matching and heuristics
   */
  private async checkSpam(email: EmailMessageData): Promise<{
    isSpam: boolean;
    score: number;
    warnings: string[];
  }> {
    let score = 0;
    const warnings: string[] = [];
    const content = `${email.subject} ${email.textBody || email.htmlBody || ''}`.toLowerCase();

    // Check suspicious patterns
    if (this.config.enableContentFiltering) {
      for (const pattern of this.config.suspiciousPatterns) {
        const regex = new RegExp(pattern, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length * 15;
          warnings.push(`Contains suspicious pattern: "${pattern}"`);
        }
      }
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      score += 20;
      warnings.push('Excessive use of capital letters');
    }

    // Check for excessive punctuation
    const punctRatio = (content.match(/[!?]{2,}/g) || []).length;
    if (punctRatio > 3) {
      score += 15;
      warnings.push('Excessive punctuation marks');
    }

    // Check for suspicious subject patterns
    if (email.subject) {
      const suspiciousSubjectPatterns = [
        /^re:\s*$/i, // Empty re:
        /^fwd?:\s*$/i, // Empty fwd:
        /\$\d+/g, // Money amounts
        /free|urgent|limited|act now|click here/gi
      ];

      for (const pattern of suspiciousSubjectPatterns) {
        if (pattern.test(email.subject)) {
          score += 10;
          warnings.push('Suspicious subject line pattern');
          break;
        }
      }
    }

    // Check for missing sender name
    if (!email.fromName || email.fromName.trim() === '') {
      score += 5;
      warnings.push('Missing sender name');
    }

    return {
      isSpam: score >= this.config.spamThreshold,
      score,
      warnings
    };
  }

  /**
   * Scan email content for malicious patterns
   */
  private scanContent(email: EmailMessageData): {
    score: number;
    threats: string[];
    warnings: string[];
  } {
    let score = 0;
    const threats: string[] = [];
    const warnings: string[] = [];

    const textContent = email.textBody || '';
    const htmlContent = email.htmlBody || '';

    // Check for embedded scripts in HTML
    if (htmlContent) {
      const scriptPatterns = [
        /<script[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onclick|onmouseover|onload/gi
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(htmlContent)) {
          score += 25;
          threats.push('Contains embedded scripts');
          break;
        }
      }

      // Check for hidden content
      if (/<div[^>]*display:\s*none/gi.test(htmlContent) ||
          /<span[^>]*font-size:\s*0/gi.test(htmlContent)) {
        score += 15;
        warnings.push('Contains hidden content');
      }
    }

    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s<>\"{}|\\^`[\]]+/gi;
    const urls = [...textContent.matchAll(urlPattern), ...htmlContent.matchAll(urlPattern)];
    
    for (const urlMatch of urls) {
      const url = urlMatch[0];
      if (this.isSuspiciousUrl(url)) {
        score += 20;
        warnings.push(`Suspicious URL detected: ${url.substring(0, 50)}...`);
      }
    }

    // Check for base64 encoded content (potential malware)
    if (/data:[\w\/\+]+=*;base64,/gi.test(htmlContent)) {
      score += 15;
      warnings.push('Contains base64 encoded data');
    }

    return { score, threats, warnings };
  }

  /**
   * Check if URL is suspicious
   */
  private isSuspiciousUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domains
      const suspiciousDomains = [
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', // URL shorteners
        'suspicious-domain.com' // Add more as needed
      ];

      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }

      // Check for suspicious patterns
      if (urlObj.hostname.includes('xn--') || // Punycode
          urlObj.hostname.split('.').length > 4 || // Too many subdomains
          /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(urlObj.hostname)) { // IP addresses
        return true;
      }

      return false;
    } catch {
      return true; // Invalid URLs are suspicious
    }
  }

  /**
   * Scan URLs in email content
   */
  private async scanUrls(email: EmailMessageData): Promise<{
    score: number;
    threats: string[];
    warnings: string[];
  }> {
    const threats: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    const content = `${email.textBody || ''} ${email.htmlBody || ''}`;
    const urlPattern = /https?:\/\/[^\s<>\"{}|\\^`[\]]+/gi;
    const urls = [...content.matchAll(urlPattern)];

    for (const urlMatch of urls) {
      const url = urlMatch[0];
      
      if (this.isSuspiciousUrl(url)) {
        score += 15;
        warnings.push(`Suspicious URL: ${url.substring(0, 50)}...`);
      }

      // Check against known malicious URL patterns
      if (this.isMaliciousUrl(url)) {
        score += 30;
        threats.push(`Potentially malicious URL: ${url.substring(0, 50)}...`);
      }
    }

    return { score, threats, warnings };
  }

  /**
   * Check if URL is known to be malicious
   */
  private isMaliciousUrl(url: string): boolean {
    // In a real implementation, this would check against threat intelligence feeds
    const maliciousPatterns = [
      /phishing/i,
      /malware/i,
      /virus/i,
      /trojan/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check sender reputation
   */
  private async checkSenderReputation(email: EmailMessageData): Promise<{
    score: number;
    lowReputation: boolean;
  }> {
    // Check database for sender history
    const senderHistory = await prisma.emailMessage.findMany({
      where: {
        fromEmail: email.fromEmail,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    let reputationScore = 0;

    // Calculate reputation based on message history
    if (senderHistory.length === 0) {
      // New sender - neutral but slightly suspicious
      reputationScore = 10;
    } else {
      const failedMessages = senderHistory.filter(m => m.status === 'QUARANTINED' || m.status === 'BLOCKED').length;
      const failureRate = failedMessages / senderHistory.length;
      
      if (failureRate > 0.5) {
        reputationScore = 30; // High failure rate
      } else if (failureRate > 0.2) {
        reputationScore = 15; // Moderate failure rate
      } else {
        reputationScore = 0; // Good reputation
      }
    }

    return {
      score: reputationScore,
      lowReputation: reputationScore >= this.config.reputationThreshold
    };
  }

  /**
   * Scan email attachments for security threats
   */
  private async scanAttachments(attachments: any[]): Promise<{
    totalScore: number;
    threats: string[];
    warnings: string[];
    results: AttachmentSecurityResult[];
  }> {
    const threats: string[] = [];
    const warnings: string[] = [];
    const results: AttachmentSecurityResult[] = [];
    let totalScore = 0;

    for (const attachment of attachments) {
      const result = await this.scanSingleAttachment(attachment);
      results.push(result);
      
      if (result.riskLevel === 'CRITICAL') {
        totalScore += 40;
        threats.push(`Malicious attachment: ${result.filename}`);
      } else if (result.riskLevel === 'HIGH') {
        totalScore += 25;
        threats.push(`High-risk attachment: ${result.filename}`);
      } else if (result.riskLevel === 'MEDIUM') {
        totalScore += 15;
        warnings.push(`Suspicious attachment: ${result.filename}`);
      }
    }

    return {
      totalScore,
      threats,
      warnings,
      results
    };
  }

  /**
   * Scan single attachment
   */
  private async scanSingleAttachment(attachment: any): Promise<AttachmentSecurityResult> {
    const filename = attachment.filename || 'unknown';
    const fileSize = attachment.size || 0;
    const threats: string[] = [];
    const warnings: string[] = [];
    let riskLevel: AttachmentSecurityResult['riskLevel'] = 'LOW';
    let allowDownload = true;
    let quarantined = false;

    // Extract file extension
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    const fileType = this.getFileType(fileExtension);

    // Check file size
    if (fileSize > this.config.maxAttachmentSize) {
      threats.push('File exceeds maximum size limit');
      riskLevel = 'HIGH';
      allowDownload = false;
    }

    // Check blocked file types
    if (this.config.blockedFileTypes.includes(fileExtension)) {
      threats.push('File type is blocked');
      riskLevel = 'CRITICAL';
      allowDownload = false;
    }

    // Check quarantine file types
    if (this.config.quarantineFileTypes.includes(fileExtension)) {
      warnings.push('File type requires quarantine');
      riskLevel = 'MEDIUM';
      quarantined = true;
    }

    // Check for double extensions (e.g., file.pdf.exe)
    const extensionCount = (filename.match(/\./g) || []).length;
    if (extensionCount > 1) {
      const parts = filename.split('.');
      if (parts.length > 2) {
        const secondLastExt = parts[parts.length - 2].toLowerCase();
        if (['pdf', 'doc', 'txt', 'jpg', 'png'].includes(secondLastExt)) {
          threats.push('Suspicious double extension detected');
          riskLevel = 'HIGH';
          allowDownload = false;
        }
      }
    }

    // Check filename patterns
    if (this.isSuspiciousFilename(filename)) {
      warnings.push('Suspicious filename pattern');
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    return {
      filename,
      isSecure: riskLevel === 'LOW',
      riskLevel,
      threats,
      warnings,
      allowDownload,
      quarantined,
      fileType,
      fileSize
    };
  }

  /**
   * Get file type category
   */
  private getFileType(extension: string): string {
    const typeMap: { [key: string]: string } = {
      'pdf': 'document',
      'doc': 'document', 'docx': 'document',
      'xls': 'spreadsheet', 'xlsx': 'spreadsheet',
      'ppt': 'presentation', 'pptx': 'presentation',
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
      'zip': 'archive', 'rar': 'archive', '7z': 'archive',
      'exe': 'executable', 'bat': 'executable', 'com': 'executable',
      'txt': 'text', 'rtf': 'text'
    };

    return typeMap[extension] || 'unknown';
  }

  /**
   * Check if filename is suspicious
   */
  private isSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /invoice/i,
      /urgent/i,
      /important/i,
      /payment/i,
      /receipt/i,
      /document/i,
      /[a-z]{20,}/i, // Very long random strings
      /^\d+$/, // Only numbers
      /\s{2,}/ // Multiple spaces
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Sanitize email content
   */
  private sanitizeContent(email: EmailMessageData): {
    textBody?: string;
    htmlBody?: string;
    subject?: string;
  } {
    return {
      textBody: email.textBody,
      htmlBody: this.sanitizeHtml(email.htmlBody || ''),
      subject: this.sanitizeSubject(email.subject || '')
    };
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHtml(html: string): string {
    // Remove scripts
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    
    // Remove event handlers
    html = html.replace(/\s*on\w+\s*=\s*["\'][^"\']*["\']?/gi, '');
    
    // Remove javascript: URLs
    html = html.replace(/javascript:[^"']*/gi, '');
    
    // Remove vbscript: URLs
    html = html.replace(/vbscript:[^"']*/gi, '');
    
    return html;
  }

  /**
   * Sanitize email subject
   */
  private sanitizeSubject(subject: string): string {
    // Remove excessive whitespace
    subject = subject.replace(/\s+/g, ' ').trim();
    
    // Remove suspicious characters
    subject = subject.replace(/[^\w\s\-.,!?()[\]{}]/g, '');
    
    return subject;
  }

  /**
   * Log security check result
   */
  private async logSecurityCheck(
    email: EmailMessageData,
    integrationId: string,
    result: { score: number; riskLevel: string; threats: string[]; warnings: string[] }
  ): Promise<void> {
    try {
      await prisma.emailProcessingLog.create({
        data: {
          integrationId,
          messageId: email.messageId,
          action: 'SECURITY_CHECK',
          status: result.threats.length > 0 ? 'WARNING' : 'SUCCESS',
          details: {
            securityScore: result.score,
            riskLevel: result.riskLevel,
            threats: result.threats,
            warnings: result.warnings,
            fromEmail: email.fromEmail,
            subject: email.subject
          }
        }
      });
    } catch (error) {
      console.error('Failed to log security check:', error);
    }
  }

  /**
   * Update security configuration
   */
  updateConfig(config: Partial<EmailSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current security configuration
   */
  getConfig(): EmailSecurityConfig {
    return { ...this.config };
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(since?: Date): Promise<{
    totalChecked: number;
    threatsBlocked: number;
    spamDetected: number;
    maliciousAttachments: number;
    averageRiskScore: number;
    riskDistribution: Record<string, number>;
  }> {
    const whereClause: any = {
      action: 'SECURITY_CHECK'
    };
    
    if (since) {
      whereClause.createdAt = { gte: since };
    }

    const logs = await prisma.emailProcessingLog.findMany({
      where: whereClause,
      select: {
        details: true,
        status: true
      }
    });

    const stats = {
      totalChecked: logs.length,
      threatsBlocked: 0,
      spamDetected: 0,
      maliciousAttachments: 0,
      averageRiskScore: 0,
      riskDistribution: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      } as Record<string, number>
    };

    let totalRiskScore = 0;

    for (const log of logs) {
      const details = log.details as any;
      
      if (details.threats?.length > 0) {
        stats.threatsBlocked++;
      }
      
      if (details.warnings?.some((w: string) => w.includes('spam'))) {
        stats.spamDetected++;
      }
      
      if (details.warnings?.some((w: string) => w.includes('attachment'))) {
        stats.maliciousAttachments++;
      }
      
      if (details.securityScore) {
        totalRiskScore += details.securityScore;
      }
      
      if (details.riskLevel) {
        stats.riskDistribution[details.riskLevel]++;
      }
    }

    stats.averageRiskScore = logs.length > 0 ? totalRiskScore / logs.length : 0;

    return stats;
  }
}

/**
 * Default email security service instance
 */
export const emailSecurityService = new EmailSecurityService();