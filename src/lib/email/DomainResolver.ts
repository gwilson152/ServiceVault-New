import { prisma } from '@/lib/prisma';

/**
 * Domain resolution result
 */
export interface DomainResolution {
  accountId: string;
  domain: string;
  priority: number;
  exactMatch: boolean;
}

/**
 * Service for resolving email domains to accounts
 */
export class DomainResolver {
  /**
   * Cache for domain mappings to improve performance
   */
  private static domainCache: Map<string, DomainResolution> = new Map();
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Resolve an email address to an account ID
   */
  static async resolveEmailToAccount(email: string): Promise<DomainResolution | null> {
    const domain = this.extractDomainFromEmail(email);
    if (!domain) return null;

    return this.resolveDomainToAccount(domain);
  }

  /**
   * Resolve a domain to an account ID
   */
  static async resolveDomainToAccount(domain: string): Promise<DomainResolution | null> {
    // Check cache first
    const cached = this.getCachedResolution(domain);
    if (cached) return cached;

    // Load fresh mappings if cache is expired
    if (Date.now() > this.cacheExpiry) {
      await this.refreshDomainCache();
    }

    // Try direct domain match
    const directMatch = this.domainCache.get(domain.toLowerCase());
    if (directMatch) {
      return directMatch;
    }

    // Try subdomain matching (find parent domains)
    return this.findBestParentDomainMatch(domain);
  }

  /**
   * Extract domain from email address
   */
  private static extractDomainFromEmail(email: string): string | null {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Get cached resolution if valid
   */
  private static getCachedResolution(domain: string): DomainResolution | null {
    if (Date.now() > this.cacheExpiry) {
      return null; // Cache expired
    }

    return this.domainCache.get(domain.toLowerCase()) || null;
  }

  /**
   * Refresh the domain mappings cache
   */
  private static async refreshDomainCache(): Promise<void> {
    try {
      const mappings = await prisma.domainMapping.findMany({
        where: { isActive: true },
        include: {
          account: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { domain: 'asc' }
        ]
      });

      // Clear and rebuild cache
      this.domainCache.clear();

      for (const mapping of mappings) {
        this.domainCache.set(mapping.domain.toLowerCase(), {
          accountId: mapping.accountId,
          domain: mapping.domain,
          priority: mapping.priority,
          exactMatch: true
        });
      }

      // Set cache expiry
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

    } catch (error) {
      console.error('Failed to refresh domain cache:', error);
      // Don't throw - continue with stale cache if available
    }
  }

  /**
   * Find the best parent domain match for a subdomain
   */
  private static findBestParentDomainMatch(domain: string): DomainResolution | null {
    const domainParts = domain.split('.');
    let bestMatch: DomainResolution | null = null;

    // Try progressively shorter domain suffixes
    // e.g., for "mail.support.company.com", try:
    // - support.company.com
    // - company.com
    // - com
    for (let i = 1; i < domainParts.length; i++) {
      const parentDomain = domainParts.slice(i).join('.');
      const match = this.domainCache.get(parentDomain.toLowerCase());
      
      if (match) {
        // Keep the highest priority match
        if (!bestMatch || match.priority > bestMatch.priority) {
          bestMatch = {
            ...match,
            exactMatch: false // This is a parent domain match
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get all domain mappings (for management UI)
   */
  static async getAllDomainMappings() {
    return prisma.domainMapping.findMany({
      include: {
        account: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { domain: 'asc' }
      ]
    });
  }

  /**
   * Create a new domain mapping
   */
  static async createDomainMapping(data: {
    domain: string;
    accountId: string;
    priority?: number;
    isActive?: boolean;
  }) {
    // Validate domain format
    if (!this.isValidDomain(data.domain)) {
      throw new Error('Invalid domain format');
    }

    // Check for existing mapping
    const existing = await prisma.domainMapping.findUnique({
      where: { domain: data.domain.toLowerCase() }
    });

    if (existing) {
      throw new Error(`Domain mapping already exists for ${data.domain}`);
    }

    // Create mapping
    const mapping = await prisma.domainMapping.create({
      data: {
        domain: data.domain.toLowerCase(),
        accountId: data.accountId,
        priority: data.priority || 0,
        isActive: data.isActive ?? true
      },
      include: {
        account: {
          select: { id: true, name: true, companyName: true }
        }
      }
    });

    // Invalidate cache
    this.invalidateCache();

    return mapping;
  }

  /**
   * Update a domain mapping
   */
  static async updateDomainMapping(id: string, data: {
    domain?: string;
    accountId?: string;
    priority?: number;
    isActive?: boolean;
  }) {
    if (data.domain && !this.isValidDomain(data.domain)) {
      throw new Error('Invalid domain format');
    }

    // If domain is being changed, check for conflicts
    if (data.domain) {
      const existing = await prisma.domainMapping.findFirst({
        where: {
          domain: data.domain.toLowerCase(),
          NOT: { id }
        }
      });

      if (existing) {
        throw new Error(`Domain mapping already exists for ${data.domain}`);
      }
    }

    const mapping = await prisma.domainMapping.update({
      where: { id },
      data: {
        ...(data.domain && { domain: data.domain.toLowerCase() }),
        ...(data.accountId && { accountId: data.accountId }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        account: {
          select: { id: true, name: true, companyName: true }
        }
      }
    });

    // Invalidate cache
    this.invalidateCache();

    return mapping;
  }

  /**
   * Delete a domain mapping
   */
  static async deleteDomainMapping(id: string) {
    await prisma.domainMapping.delete({
      where: { id }
    });

    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Validate domain format
   */
  private static isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Invalidate the domain cache
   */
  static invalidateCache(): void {
    this.domainCache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  static getCacheStats() {
    return {
      size: this.domainCache.size,
      expiresIn: Math.max(0, this.cacheExpiry - Date.now()),
      isExpired: Date.now() > this.cacheExpiry
    };
  }

  /**
   * Test domain resolution (for testing/debugging)
   */
  static async testResolution(email: string) {
    const domain = this.extractDomainFromEmail(email);
    if (!domain) {
      return { error: 'Invalid email format' };
    }

    const resolution = await this.resolveDomainToAccount(domain);
    
    return {
      email,
      domain,
      resolution,
      cacheStats: this.getCacheStats()
    };
  }

  /**
   * Bulk import domain mappings from legacy account.domains field
   */
  static async importFromLegacyDomains() {
    const accounts = await prisma.account.findMany({
      where: {
        domains: { not: null },
        domainMappings: { none: {} } // Only accounts without existing mappings
      },
      select: {
        id: true,
        name: true,
        domains: true
      }
    });

    const importedMappings = [];

    for (const account of accounts) {
      if (!account.domains) continue;

      // Parse comma-separated domains
      const domains = account.domains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d && this.isValidDomain(d));

      for (const domain of domains) {
        try {
          const mapping = await this.createDomainMapping({
            domain,
            accountId: account.id,
            priority: 0,
            isActive: true
          });

          importedMappings.push({
            domain,
            accountName: account.name,
            mappingId: mapping.id
          });
        } catch (error) {
          console.error(`Failed to import domain ${domain} for account ${account.name}:`, error);
        }
      }
    }

    return {
      imported: importedMappings.length,
      mappings: importedMappings
    };
  }
}

/**
 * Default domain resolver instance
 */
export const domainResolver = DomainResolver;