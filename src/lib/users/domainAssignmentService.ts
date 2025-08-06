/**
 * Domain Assignment Service
 * 
 * Handles automatic user assignment to accounts based on email domains.
 * Uses the CSV domains field on Account table to match user emails
 * and automatically assign users to the appropriate accounts.
 * 
 * Features:
 * - Email domain matching with CSV parsing
 * - Hierarchical account inheritance (child accounts inherit parent domains)
 * - Automatic account membership creation
 * - Default role assignment for domain-matched users
 * - Conflict resolution for multiple domain matches
 * 
 * Integration:
 * - Called during user creation and invitation processes
 * - Used in user management workflows
 * - Integrates with permission system for role assignment
 */

import { prisma } from '@/lib/prisma';

export interface DomainMatch {
  accountId: string;
  accountName: string;
  domain: string;
  isInherited: boolean;
  parentAccountId?: string;
}

export interface DomainAssignmentResult {
  assigned: boolean;
  accountId?: string;
  accountName?: string;
  domain?: string;
  membershipId?: string;
  roleIds?: string[];
  message?: string;
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

/**
 * Parse CSV domains field into array of domains
 */
export function parseDomains(domainsString: string | null): string[] {
  if (!domainsString) return [];
  
  return domainsString
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0 && domain.includes('.'));
}

/**
 * Find accounts that match a given email domain
 * Includes inherited domains from parent accounts
 */
export async function findMatchingAccounts(email: string): Promise<DomainMatch[]> {
  try {
    const domain = extractDomain(email);
    if (!domain) return [];

    // Get all accounts with their hierarchy and domains
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        domains: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            domains: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                domains: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    domains: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const matches: DomainMatch[] = [];

    for (const account of accounts) {
      // Check direct domains
      const directDomains = parseDomains(account.domains);
      if (directDomains.includes(domain)) {
        matches.push({
          accountId: account.id,
          accountName: account.name,
          domain,
          isInherited: false
        });
      }

      // Check parent hierarchy domains (inheritance)
      let currentParent = account.parent;
      while (currentParent) {
        const parentDomains = parseDomains(currentParent.domains);
        if (parentDomains.includes(domain)) {
          matches.push({
            accountId: account.id,
            accountName: account.name,
            domain,
            isInherited: true,
            parentAccountId: currentParent.id
          });
          break; // Only inherit from immediate parent with domain
        }
        currentParent = currentParent.parent;
      }
    }

    return matches;
  } catch (error) {
    console.error('Error finding matching accounts for domain:', error);
    return [];
  }
}

/**
 * Get default roles for domain-assigned users
 * Returns appropriate role IDs for automatically assigned users
 */
export async function getDefaultDomainRoles(): Promise<string[]> {
  try {
    // Look for a role specifically for domain-assigned users
    const domainRole = await prisma.role.findFirst({
      where: {
        name: { in: ['Domain User', 'Auto-Assigned User', 'Standard User'] }
      },
      select: { id: true }
    });

    if (domainRole) {
      return [domainRole.id];
    }

    // Fallback: find the most basic user role
    const basicRole = await prisma.role.findFirst({
      where: {
        permissions: {
          hasEvery: ['tickets:view-own', 'time-entries:create']
        }
      },
      select: { id: true },
      orderBy: { permissions: 'asc' } // Get role with fewest permissions
    });

    return basicRole ? [basicRole.id] : [];
  } catch (error) {
    console.error('Error getting default domain roles:', error);
    return [];
  }
}

/**
 * Assign user to account based on email domain matching
 * Returns assignment result with details
 */
export async function assignUserByDomain(
  userId: string, 
  email: string
): Promise<DomainAssignmentResult> {
  try {
    const matches = await findMatchingAccounts(email);
    
    if (matches.length === 0) {
      return {
        assigned: false,
        message: 'No accounts found matching email domain'
      };
    }

    // Prefer direct domain matches over inherited ones
    const directMatches = matches.filter(m => !m.isInherited);
    const selectedMatch = directMatches.length > 0 ? directMatches[0] : matches[0];

    // Check if user already has membership to this account
    const existingMembership = await prisma.accountMembership.findUnique({
      where: {
        userId_accountId: {
          userId,
          accountId: selectedMatch.accountId
        }
      }
    });

    if (existingMembership) {
      return {
        assigned: false,
        accountId: selectedMatch.accountId,
        accountName: selectedMatch.accountName,
        domain: selectedMatch.domain,
        message: 'User already has membership to this account'
      };
    }

    // Get default roles for domain-assigned users
    const defaultRoleIds = await getDefaultDomainRoles();

    // Create account membership
    const membership = await prisma.accountMembership.create({
      data: {
        userId,
        accountId: selectedMatch.accountId,
        invitationStatus: 'ACCEPTED',
        joinedAt: new Date(),
        ...(defaultRoleIds.length > 0 && {
          roles: {
            connect: defaultRoleIds.map(id => ({ id }))
          }
        })
      },
      select: {
        id: true,
        roles: {
          select: { id: true }
        }
      }
    });

    return {
      assigned: true,
      accountId: selectedMatch.accountId,
      accountName: selectedMatch.accountName,
      domain: selectedMatch.domain,
      membershipId: membership.id,
      roleIds: membership.roles.map(r => r.id),
      message: selectedMatch.isInherited 
        ? `Assigned to ${selectedMatch.accountName} via inherited domain ${selectedMatch.domain}`
        : `Assigned to ${selectedMatch.accountName} via domain ${selectedMatch.domain}`
    };

  } catch (error) {
    console.error('Error assigning user by domain:', error);
    return {
      assigned: false,
      message: 'Failed to assign user by domain'
    };
  }
}

/**
 * Batch assign multiple users by domain
 * Useful for processing existing users or bulk operations
 */
export async function batchAssignUsersByDomain(
  userEmails: { userId: string; email: string }[]
): Promise<DomainAssignmentResult[]> {
  const results: DomainAssignmentResult[] = [];

  for (const { userId, email } of userEmails) {
    const result = await assignUserByDomain(userId, email);
    results.push(result);
  }

  return results;
}

/**
 * Get users that could be assigned by domain but aren't yet
 * Useful for finding unassigned users with matching domains
 */
export async function findUnassignedDomainUsers(): Promise<{
  userId: string;
  email: string;
  name: string;
  potentialAccounts: DomainMatch[];
}[]> {
  try {
    // Get users without any account memberships
    const unassignedUsers = await prisma.user.findMany({
      where: {
        memberships: {
          none: {}
        },
        email: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    const results = [];

    for (const user of unassignedUsers) {
      if (!user.email) continue;
      
      const matches = await findMatchingAccounts(user.email);
      if (matches.length > 0) {
        results.push({
          userId: user.id,
          email: user.email,
          name: user.name || 'Unknown',
          potentialAccounts: matches
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error finding unassigned domain users:', error);
    return [];
  }
}

/**
 * Validate domain configuration for account
 * Checks for conflicts and formatting issues
 */
export async function validateAccountDomains(accountId: string): Promise<{
  valid: boolean;
  issues: string[];
  domains: string[];
}> {
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { domains: true, name: true }
    });

    if (!account) {
      return {
        valid: false,
        issues: ['Account not found'],
        domains: []
      };
    }

    const domains = parseDomains(account.domains);
    const issues: string[] = [];

    // Check for invalid domain formats
    for (const domain of domains) {
      if (!domain.includes('.')) {
        issues.push(`Invalid domain format: ${domain}`);
      }
      if (domain.includes(' ')) {
        issues.push(`Domain contains spaces: ${domain}`);
      }
    }

    // Check for conflicts with other accounts
    if (domains.length > 0) {
      const conflictingAccounts = await prisma.account.findMany({
        where: {
          id: { not: accountId },
          domains: { not: null }
        },
        select: { id: true, name: true, domains: true }
      });

      for (const otherAccount of conflictingAccounts) {
        const otherDomains = parseDomains(otherAccount.domains);
        const conflicts = domains.filter(d => otherDomains.includes(d));
        if (conflicts.length > 0) {
          issues.push(`Domain conflicts with ${otherAccount.name}: ${conflicts.join(', ')}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      domains
    };
  } catch (error) {
    console.error('Error validating account domains:', error);
    return {
      valid: false,
      issues: ['Validation failed'],
      domains: []
    };
  }
}