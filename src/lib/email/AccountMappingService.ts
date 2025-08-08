import { prisma } from '@/lib/prisma';
import type { Account, AccountMembership } from '@prisma/client';
import type { EmailMessageData } from './providers/EmailProvider';
import type { ParsedTicketData } from './EmailParser';

/**
 * Account mapping result
 */
export interface AccountMapping {
  account: Account;
  assignedAccountUser?: AccountMembership;
  mappingMethod: 'DOMAIN_MATCH' | 'HIERARCHY_RULE' | 'MANUAL_ASSIGNMENT' | 'FALLBACK_DEFAULT';
  confidence: number; // 0-100
  reason: string;
}

/**
 * Account mapping configuration
 */
export interface AccountMappingConfig {
  // Domain matching settings
  enableDomainMatching: boolean;
  strictDomainMatching: boolean; // Require exact domain match vs substring
  caseSensitiveDomains: boolean;
  
  // Hierarchy settings
  enableHierarchyInheritance: boolean;
  maxHierarchyDepth: number;
  
  // Fallback settings
  defaultAccountId?: string;
  createAccountForUnmatchedDomains: boolean;
  
  // Email processing rules
  ignoredDomains: string[]; // Domains to ignore (e.g., gmail.com, yahoo.com)
  trustedDomains: string[]; // Domains that always create high-confidence matches
  
  // Custom mapping rules
  customMappingRules: Array<{
    condition: 'SENDER_DOMAIN' | 'SENDER_EMAIL' | 'SUBJECT_CONTAINS' | 'BODY_CONTAINS';
    value: string;
    accountId: string;
    priority: number; // Higher priority rules are checked first
  }>;
}

/**
 * Default account mapping configuration
 */
const DEFAULT_MAPPING_CONFIG: AccountMappingConfig = {
  enableDomainMatching: true,
  strictDomainMatching: true,
  caseSensitiveDomains: false,
  enableHierarchyInheritance: true,
  maxHierarchyDepth: 3,
  createAccountForUnmatchedDomains: false,
  ignoredDomains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'],
  trustedDomains: [],
  customMappingRules: []
};

/**
 * Service for mapping emails to accounts using domain matching and hierarchy rules
 */
export class AccountMappingService {
  private config: AccountMappingConfig;
  private domainCache = new Map<string, Account[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<AccountMappingConfig>) {
    this.config = { ...DEFAULT_MAPPING_CONFIG, ...config };
  }

  /**
   * Map email to account using various strategies
   */
  async mapEmailToAccount(
    email: EmailMessageData, 
    parsedTicket: ParsedTicketData
  ): Promise<AccountMapping | null> {
    try {
      // Extract sender domain
      const senderDomain = this.extractDomain(email.fromEmail);
      if (!senderDomain) {
        throw new Error('Invalid sender email format');
      }

      // Check if domain should be ignored
      if (this.isIgnoredDomain(senderDomain)) {
        console.log(`Ignoring email from generic domain: ${senderDomain}`);
        return await this.getFallbackAccount(email, 'IGNORED_DOMAIN');
      }

      // Try custom mapping rules first (highest priority)
      const customMapping = await this.tryCustomMappingRules(email, parsedTicket);
      if (customMapping) {
        return customMapping;
      }

      // Try domain matching
      if (this.config.enableDomainMatching) {
        const domainMapping = await this.tryDomainMatching(senderDomain, email);
        if (domainMapping) {
          return domainMapping;
        }
      }

      // Try hierarchy-based matching
      if (this.config.enableHierarchyInheritance) {
        const hierarchyMapping = await this.tryHierarchyMatching(senderDomain, email);
        if (hierarchyMapping) {
          return hierarchyMapping;
        }
      }

      // Fallback to default account
      return await this.getFallbackAccount(email, 'NO_MATCH_FOUND');

    } catch (error) {
      console.error('Error mapping email to account:', error);
      return await this.getFallbackAccount(email, 'MAPPING_ERROR');
    }
  }

  /**
   * Try custom mapping rules
   */
  private async tryCustomMappingRules(
    email: EmailMessageData, 
    parsedTicket: ParsedTicketData
  ): Promise<AccountMapping | null> {
    // Sort rules by priority (highest first)
    const sortedRules = [...this.config.customMappingRules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      let matches = false;

      switch (rule.condition) {
        case 'SENDER_DOMAIN':
          matches = this.extractDomain(email.fromEmail) === rule.value;
          break;
        case 'SENDER_EMAIL':
          matches = email.fromEmail.toLowerCase() === rule.value.toLowerCase();
          break;
        case 'SUBJECT_CONTAINS':
          matches = email.subject.toLowerCase().includes(rule.value.toLowerCase());
          break;
        case 'BODY_CONTAINS':
          const body = email.textBody || email.htmlBody || '';
          matches = body.toLowerCase().includes(rule.value.toLowerCase());
          break;
      }

      if (matches) {
        const account = await prisma.account.findUnique({
          where: { id: rule.accountId }
        });

        if (account) {
          const assignedUser = await this.findAccountUser(account.id, email.fromEmail);

          return {
            account,
            assignedAccountUser: assignedUser || undefined,
            mappingMethod: 'MANUAL_ASSIGNMENT',
            confidence: 95,
            reason: `Matched custom rule: ${rule.condition} = ${rule.value}`
          };
        }
      }
    }

    return null;
  }

  /**
   * Try domain-based account matching
   */
  private async tryDomainMatching(domain: string, email: EmailMessageData): Promise<AccountMapping | null> {
    const accounts = await this.getAccountsByDomain(domain);

    if (accounts.length === 0) {
      return null;
    }

    // If multiple accounts match, prefer exact domain match
    let bestAccount = accounts[0];
    let confidence = 70;
    let reason = `Domain match: ${domain}`;

    if (accounts.length === 1) {
      confidence = 85;
    } else {
      // Multiple matches - try to find the most specific one
      const exactMatches = accounts.filter(account => {
        const accountDomains = this.parseAccountDomains(account.domains);
        return accountDomains.includes(domain.toLowerCase());
      });

      if (exactMatches.length === 1) {
        bestAccount = exactMatches[0];
        confidence = 90;
        reason = `Exact domain match: ${domain}`;
      } else if (exactMatches.length > 1) {
        // Multiple exact matches - prefer organization over individual
        const orgAccount = exactMatches.find(acc => acc.accountType === 'ORGANIZATION');
        if (orgAccount) {
          bestAccount = orgAccount;
          confidence = 85;
          reason = `Organization domain match: ${domain}`;
        }
      }
    }

    // Find the specific user within the account
    const assignedUser = await this.findAccountUser(bestAccount.id, email.fromEmail);

    return {
      account: bestAccount,
      assignedAccountUser: assignedUser || undefined,
      mappingMethod: 'DOMAIN_MATCH',
      confidence,
      reason
    };
  }

  /**
   * Try hierarchy-based matching
   */
  private async tryHierarchyMatching(domain: string, email: EmailMessageData): Promise<AccountMapping | null> {
    // Look for parent domains that might match
    const domainParts = domain.split('.');
    
    for (let i = 1; i < domainParts.length && i < this.config.maxHierarchyDepth; i++) {
      const parentDomain = domainParts.slice(i).join('.');
      const parentAccounts = await this.getAccountsByDomain(parentDomain);

      if (parentAccounts.length > 0) {
        const parentAccount = parentAccounts[0];
        
        // Check if we should create a subsidiary account for this subdomain
        if (this.shouldCreateSubsidiary(parentAccount, domain)) {
          const subsidiaryAccount = await this.createSubsidiaryAccount(parentAccount, domain, email);
          
          if (subsidiaryAccount) {
            const assignedUser = await this.findOrCreateAccountUser(subsidiaryAccount.id, email);

            return {
              account: subsidiaryAccount,
              assignedAccountUser: assignedUser || undefined,
              mappingMethod: 'HIERARCHY_RULE',
              confidence: 75,
              reason: `Created subsidiary for ${domain} under ${parentAccount.name}`
            };
          }
        } else {
          // Use parent account directly
          const assignedUser = await this.findOrCreateAccountUser(parentAccount.id, email);

          return {
            account: parentAccount,
            assignedAccountUser: assignedUser || undefined,
            mappingMethod: 'HIERARCHY_RULE',
            confidence: 60,
            reason: `Hierarchical match to parent domain: ${parentDomain}`
          };
        }
      }
    }

    return null;
  }

  /**
   * Get fallback account when no mapping is found
   */
  private async getFallbackAccount(email: EmailMessageData, reason: string): Promise<AccountMapping | null> {
    if (this.config.defaultAccountId) {
      const defaultAccount = await prisma.account.findUnique({
        where: { id: this.config.defaultAccountId }
      });

      if (defaultAccount) {
        const assignedUser = await this.findOrCreateAccountUser(defaultAccount.id, email);

        return {
          account: defaultAccount,
          assignedAccountUser: assignedUser || undefined,
          mappingMethod: 'FALLBACK_DEFAULT',
          confidence: 30,
          reason: `Fallback to default account (${reason})`
        };
      }
    }

    // Create new account if enabled
    if (this.config.createAccountForUnmatchedDomains) {
      const domain = this.extractDomain(email.fromEmail);
      if (domain && !this.isIgnoredDomain(domain)) {
        const newAccount = await this.createAccountForDomain(domain, email);
        
        if (newAccount) {
          const assignedUser = await this.findOrCreateAccountUser(newAccount.id, email);

          return {
            account: newAccount,
            assignedAccountUser: assignedUser || undefined,
            mappingMethod: 'FALLBACK_DEFAULT',
            confidence: 50,
            reason: `Created new account for domain: ${domain}`
          };
        }
      }
    }

    return null;
  }

  /**
   * Get accounts that match a domain (with caching)
   */
  private async getAccountsByDomain(domain: string): Promise<Account[]> {
    const cacheKey = domain.toLowerCase();
    const now = Date.now();

    // Check cache
    if (this.domainCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.domainCache.get(cacheKey)!;
    }

    // Query database
    const accounts = await prisma.account.findMany({
      where: {
        domains: {
          contains: domain // PostgreSQL LIKE query
        }
      },
      orderBy: [
        { accountType: 'desc' }, // Organizations first
        { createdAt: 'asc' }
      ]
    });

    // Filter for exact domain matches
    const matchingAccounts = accounts.filter(account => {
      if (!account.domains) return false;
      
      const accountDomains = this.parseAccountDomains(account.domains);
      return this.config.strictDomainMatching 
        ? accountDomains.includes(domain.toLowerCase())
        : accountDomains.some(d => d.includes(domain.toLowerCase()) || domain.toLowerCase().includes(d));
    });

    // Cache result
    this.domainCache.set(cacheKey, matchingAccounts);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

    return matchingAccounts;
  }

  /**
   * Find account user by email
   */
  private async findAccountUser(accountId: string, email: string): Promise<AccountMembership | null> {
    return await prisma.accountMembership.findFirst({
      where: {
        accountId,
        user: {
          email: email.toLowerCase()
        }
      },
      include: {
        user: true
      }
    });
  }

  /**
   * Find or create account user
   */
  private async findOrCreateAccountUser(accountId: string, email: EmailMessageData): Promise<AccountMembership | null> {
    // First try to find existing user
    let user = await prisma.user.findUnique({
      where: { email: email.fromEmail.toLowerCase() }
    });

    // Create user if not exists
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: email.fromEmail.toLowerCase(),
            name: email.fromName || email.fromEmail.split('@')[0],
            emailVerified: new Date() // Auto-verify since they're sending emails
          }
        });
      } catch (error) {
        console.error('Failed to create user:', error);
        return null;
      }
    }

    // Check if membership exists
    let membership = await prisma.accountMembership.findFirst({
      where: {
        userId: user.id,
        accountId
      }
    });

    // Create membership if not exists
    if (!membership) {
      try {
        membership = await prisma.accountMembership.create({
          data: {
            userId: user.id,
            accountId
          }
        });

        // Assign default role - this would typically be 'Account User'
        // You might want to customize this based on your role system
        await this.assignDefaultRole(membership.id);
      } catch (error) {
        console.error('Failed to create account membership:', error);
        return null;
      }
    }

    return membership;
  }

  /**
   * Check if account should create subsidiary
   */
  private shouldCreateSubsidiary(parentAccount: Account, subdomain: string): boolean {
    // Only create subsidiaries for organizations
    return parentAccount.accountType === 'ORGANIZATION' && 
           this.config.enableHierarchyInheritance;
  }

  /**
   * Create subsidiary account
   */
  private async createSubsidiaryAccount(
    parentAccount: Account, 
    domain: string, 
    email: EmailMessageData
  ): Promise<Account | null> {
    try {
      const subsidiaryName = `${domain} (${parentAccount.name} Subsidiary)`;
      
      return await prisma.account.create({
        data: {
          name: subsidiaryName,
          accountType: 'SUBSIDIARY',
          parentId: parentAccount.id,
          domains: domain,
          companyName: domain.split('.')[0].toUpperCase()
        }
      });
    } catch (error) {
      console.error('Failed to create subsidiary account:', error);
      return null;
    }
  }

  /**
   * Create account for unmatched domain
   */
  private async createAccountForDomain(domain: string, email: EmailMessageData): Promise<Account | null> {
    try {
      const accountName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      
      return await prisma.account.create({
        data: {
          name: `${accountName} Organization`,
          accountType: 'ORGANIZATION',
          domains: domain,
          companyName: accountName
        }
      });
    } catch (error) {
      console.error('Failed to create account for domain:', error);
      return null;
    }
  }

  /**
   * Assign default role to new account membership
   */
  private async assignDefaultRole(membershipId: string): Promise<void> {
    try {
      // Find the 'Account User' role template
      const defaultRole = await prisma.roleTemplate.findFirst({
        where: { 
          name: 'Account User',
          isSystemRole: false 
        }
      });

      if (defaultRole) {
        await prisma.membershipRole.create({
          data: {
            membershipId,
            roleId: defaultRole.id
          }
        });
      }
    } catch (error) {
      // Ignore role assignment errors - membership still created
      console.warn('Failed to assign default role:', error);
    }
  }

  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string | null {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Parse account domains CSV
   */
  private parseAccountDomains(domainsStr: string | null): string[] {
    if (!domainsStr) return [];
    
    return domainsStr
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);
  }

  /**
   * Check if domain should be ignored
   */
  private isIgnoredDomain(domain: string): boolean {
    return this.config.ignoredDomains.includes(domain.toLowerCase());
  }

  /**
   * Clear domain cache
   */
  clearCache(): void {
    this.domainCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AccountMappingConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Get current configuration
   */
  getConfig(): AccountMappingConfig {
    return { ...this.config };
  }

  /**
   * Get mapping statistics
   */
  async getMappingStats(): Promise<{
    totalAccounts: number;
    accountsWithDomains: number;
    domainMappingRules: number;
    cacheSize: number;
  }> {
    const totalAccounts = await prisma.account.count();
    const accountsWithDomains = await prisma.account.count({
      where: {
        domains: {
          not: null
        }
      }
    });

    return {
      totalAccounts,
      accountsWithDomains,
      domainMappingRules: this.config.customMappingRules.length,
      cacheSize: this.domainCache.size
    };
  }
}

/**
 * Default account mapping service instance
 */
export const accountMappingService = new AccountMappingService();