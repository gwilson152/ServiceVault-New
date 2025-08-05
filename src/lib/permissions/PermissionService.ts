import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserPermissions {
  isSuperAdmin: boolean;
  systemPermissions: Set<string>;
  accountPermissions: Map<string, Set<string>>;
}

export interface PermissionContext {
  userId: string;
  resource: string;
  action: string;
  accountId?: string;
  resourceId?: string;
}

export class PermissionService {
  private cache = new Map<string, { permissions: UserPermissions; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive permissions for a user with caching
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.permissions;
    }

    // Single optimized query to get all user permissions
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        systemRoles: {
          include: { 
            role: {
              select: {
                permissions: true,
                inheritAllPermissions: true
              }
            }
          }
        },
        memberships: {
          include: {
            account: {
              select: { id: true, name: true }
            },
            roles: {
              include: { 
                role: {
                  select: {
                    permissions: true,
                    inheritAllPermissions: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!userData) {
      throw new Error(`User not found: ${userId}`);
    }

    const permissions: UserPermissions = {
      isSuperAdmin: false,
      systemPermissions: new Set(),
      accountPermissions: new Map()
    };

    // Check for super-admin in system roles
    for (const systemRole of userData.systemRoles) {
      if (systemRole.role.inheritAllPermissions) {
        permissions.isSuperAdmin = true;
        break; // Super admin doesn't need other permissions
      }
      
      // Add system permissions
      if (Array.isArray(systemRole.role.permissions)) {
        systemRole.role.permissions.forEach(perm => 
          permissions.systemPermissions.add(perm)
        );
      }
    }

    // Process account memberships (unless super admin)
    if (!permissions.isSuperAdmin) {
      for (const membership of userData.memberships) {
        const accountPerms = new Set<string>();
        
        for (const membershipRole of membership.roles) {
          if (membershipRole.role.inheritAllPermissions) {
            // This user is super-admin for this specific account
            permissions.isSuperAdmin = true;
            break;
          }
          
          if (Array.isArray(membershipRole.role.permissions)) {
            membershipRole.role.permissions.forEach(perm => 
              accountPerms.add(perm)
            );
          }
        }
        
        if (permissions.isSuperAdmin) break;
        
        if (accountPerms.size > 0) {
          permissions.accountPermissions.set(membership.accountId, accountPerms);
        }
      }
    }

    // Cache the result
    this.cache.set(userId, {
      permissions,
      expires: Date.now() + this.CACHE_TTL
    });

    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(context: PermissionContext): Promise<boolean> {
    const permissions = await this.getUserPermissions(context.userId);
    
    // Super admin bypasses all permission checks
    if (permissions.isSuperAdmin) {
      return true;
    }

    const permissionKey = `${context.resource}:${context.action}`;
    const wildcardResource = `${context.resource}:*`;
    const wildcardAll = '*:*';

    // Check system-wide permissions
    if (permissions.systemPermissions.has(permissionKey) ||
        permissions.systemPermissions.has(wildcardResource) ||
        permissions.systemPermissions.has(wildcardAll)) {
      return true;
    }

    // Check account-specific permissions
    if (context.accountId && permissions.accountPermissions.has(context.accountId)) {
      const accountPerms = permissions.accountPermissions.get(context.accountId)!;
      return accountPerms.has(permissionKey) || 
             accountPerms.has(wildcardResource) ||
             accountPerms.has(wildcardAll);
    }

    return false;
  }

  /**
   * Batch permission evaluation for performance
   */
  async batchEvaluate(contexts: PermissionContext[]): Promise<boolean[]> {
    const userIds = [...new Set(contexts.map(c => c.userId))];
    const userPermissions = new Map<string, UserPermissions>();
    
    // Load permissions for all unique users
    await Promise.all(
      userIds.map(async (userId) => {
        const perms = await this.getUserPermissions(userId);
        userPermissions.set(userId, perms);
      })
    );

    // Evaluate each context
    return contexts.map(context => {
      const permissions = userPermissions.get(context.userId);
      if (!permissions) return false;
      
      // Super admin bypass
      if (permissions.isSuperAdmin) return true;
      
      const permissionKey = `${context.resource}:${context.action}`;
      const wildcardResource = `${context.resource}:*`;
      const wildcardAll = '*:*';
      
      // Check system permissions
      if (permissions.systemPermissions.has(permissionKey) ||
          permissions.systemPermissions.has(wildcardResource) ||
          permissions.systemPermissions.has(wildcardAll)) {
        return true;
      }
      
      // Check account permissions
      if (context.accountId && permissions.accountPermissions.has(context.accountId)) {
        const accountPerms = permissions.accountPermissions.get(context.accountId)!;
        return accountPerms.has(permissionKey) || 
               accountPerms.has(wildcardResource) ||
               accountPerms.has(wildcardAll);
      }
      
      return false;
    });
  }

  /**
   * Get filtered data based on user permissions
   */
  async getAccessibleAccountIds(userId: string): Promise<string[]> {
    const permissions = await this.getUserPermissions(userId);
    
    // Super admin has access to all accounts
    if (permissions.isSuperAdmin) {
      const allAccounts = await prisma.account.findMany({
        select: { id: true }
      });
      return allAccounts.map(account => account.id);
    }
    
    // Return only accounts user has memberships in
    return Array.from(permissions.accountPermissions.keys());
  }

  /**
   * Invalidate cache for a user (call when permissions change)
   */
  invalidateUserPermissions(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear entire permission cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Auto-assign user to accounts based on email domain
   */
  async autoAssignUserToAccounts(email: string, userId: string): Promise<string[]> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return [];

    // Find accounts with matching domains
    const matchingAccounts = await prisma.account.findMany({
      where: {
        domains: {
          contains: domain // PostgreSQL LIKE query
        }
      },
      select: { id: true, name: true, domains: true }
    });

    const assignedAccountIds: string[] = [];

    for (const account of matchingAccounts) {
      // Parse CSV domains and check for exact match
      const domainList = account.domains?.split(',').map(d => d.trim().toLowerCase()) || [];
      
      if (domainList.includes(domain)) {
        try {
          // Create membership if it doesn't exist
          await prisma.accountMembership.upsert({
            where: {
              userId_accountId: {
                userId,
                accountId: account.id
              }
            },
            update: {}, // Don't update if it exists
            create: {
              userId,
              accountId: account.id
            }
          });
          
          assignedAccountIds.push(account.id);
          console.log(`Auto-assigned user ${email} to account ${account.name} based on domain ${domain}`);
        } catch (error) {
          console.error(`Failed to auto-assign user ${email} to account ${account.name}:`, error);
        }
      }
    }

    // Invalidate user permissions cache since memberships changed
    if (assignedAccountIds.length > 0) {
      this.invalidateUserPermissions(userId);
    }

    return assignedAccountIds;
  }

  /**
   * Assign default role to new account membership
   */
  async assignDefaultRoleToMembership(membershipId: string, roleTemplateName: string = 'Account User'): Promise<void> {
    const roleTemplate = await prisma.roleTemplate.findUnique({
      where: { name: roleTemplateName }
    });

    if (!roleTemplate) {
      console.error(`Default role template '${roleTemplateName}' not found`);
      return;
    }

    try {
      await prisma.membershipRole.create({
        data: {
          membershipId,
          roleId: roleTemplate.id
        }
      });
    } catch (error) {
      // Ignore duplicate key errors (role already assigned)
      if (!error.code?.includes('unique')) {
        console.error('Failed to assign default role:', error);
      }
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();