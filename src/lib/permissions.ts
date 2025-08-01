import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensurePermissionExists, getDefaultPermissionsForRole, PERMISSIONS_REGISTRY } from "./permissions-registry";

export interface PermissionCheck {
  resource: string;
  action: string;
  scope?: "own" | "account" | "subsidiary";
  accountId?: string; // For account-context aware permission checking
}

export async function hasPermission(
  userId: string,
  permission: PermissionCheck
): Promise<boolean> {
  try {
    // Auto-seed permission if it doesn't exist
    await ensurePermissionExists(permission);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        accountUser: {
          include: {
            account: {
              include: {
                parentAccount: true,
                childAccounts: true
              }
            },
            accountUserRoles: {
              include: {
                role: true
              }
            }
          }
        },
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return false;
    }

    // 1. Check against default role permissions first (system-level)
    const rolePermissions = getDefaultPermissionsForRole(user.role);
    const hasRolePermission = rolePermissions.some(p => 
      p.resource === permission.resource && p.action === permission.action
    );

    if (hasRolePermission) {
      return true;
    }

    // 2. Check system user assigned roles
    if (user.userRoles && user.userRoles.length > 0) {
      for (const userRole of user.userRoles) {
        const rolePermissions = Array.isArray(userRole.role.permissions) 
          ? userRole.role.permissions 
          : [];
        
        const permissionName = `${permission.resource}:${permission.action}`;
        if (rolePermissions.includes(permissionName)) {
          return true;
        }
      }
    }

    // 3. Account users can have additional specific permissions and roles
    if (user.role === "ACCOUNT_USER" && user.accountUser) {
      // Check direct account permissions (existing system)
      const accountPermission = await prisma.accountPermission.findFirst({
        where: {
          accountUserId: user.accountUser.id,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope || "own",
        },
      });

      if (accountPermission) {
        return true;
      }

      // Check AccountUser assigned roles with scope-aware logic
      if (user.accountUser.accountUserRoles && user.accountUser.accountUserRoles.length > 0) {
        for (const accountUserRole of user.accountUser.accountUserRoles) {
          const rolePermissions = Array.isArray(accountUserRole.role.permissions) 
            ? accountUserRole.role.permissions 
            : [];
          
          const permissionName = `${permission.resource}:${permission.action}`;
          if (rolePermissions.includes(permissionName)) {
            // Check if the role scope satisfies the permission scope requirement
            if (await isRoleScopeSufficient(
              accountUserRole.scope, 
              permission.scope || "own",
              user.accountUser.account,
              permission.accountId
            )) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    // Fallback to role-based check for backward compatibility
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "ADMIN") return true;
    if (user?.role === "EMPLOYEE") {
      const adminOnlyResources = ["system", "users", "permissions"];
      return !adminOnlyResources.includes(permission.resource);
    }
    return false;
  }
}

// Helper function to check if role scope is sufficient for permission scope
async function isRoleScopeSufficient(
  roleScope: string,
  requiredScope: string,
  userAccount: any,
  targetAccountId?: string
): Promise<boolean> {
  // If no specific account context is required, check general scope hierarchy
  if (!targetAccountId) {
    // Scope hierarchy: "subsidiary" > "account" > "own"
    if (roleScope === "subsidiary") return true;
    if (roleScope === "account" && (requiredScope === "account" || requiredScope === "own")) return true;
    if (roleScope === "own" && requiredScope === "own") return true;
    return false;
  }

  // Account-specific context checking
  switch (roleScope) {
    case "own":
      // Can only access own account
      return userAccount.id === targetAccountId;
      
    case "account":
      // Can access own account
      return userAccount.id === targetAccountId;
      
    case "subsidiary":
      // Can access own account and all child accounts
      if (userAccount.id === targetAccountId) return true;
      
      // Check if target account is a child (subsidiary) of user's account
      const targetAccount = await prisma.account.findUnique({
        where: { id: targetAccountId },
        include: { parentAccount: true }
      });
      
      if (targetAccount?.parentAccount?.id === userAccount.id) return true;
      
      // Recursively check the hierarchy for deeper subsidiaries
      let currentAccount = targetAccount;
      while (currentAccount?.parentAccount) {
        if (currentAccount.parentAccount.id === userAccount.id) return true;
        currentAccount = await prisma.account.findUnique({
          where: { id: currentAccount.parentAccount.id },
          include: { parentAccount: true }
        });
      }
      
      return false;
      
    default:
      return false;
  }
}

export async function requirePermission(permission: PermissionCheck) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const hasAccess = await hasPermission(session.user.id, permission);

  if (!hasAccess) {
    throw new Error("Forbidden");
  }

  return true;
}

export async function getUserPermissions(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accountUser: true }
    });

    if (!user) {
      return [];
    }

    // Admins have all permissions
    if (user.role === "ADMIN") {
      return await prisma.permission.findMany();
    }

    // Employees have most permissions except admin-only
    if (user.role === "EMPLOYEE") {
      return await prisma.permission.findMany({
        where: {
          resource: {
            notIn: ["permissions", "users", "system-settings"]
          }
        }
      });
    }

    // Account users have specific permissions
    if (user.role === "ACCOUNT_USER" && user.accountUser) {
      const accountPermissions = await prisma.accountPermission.findMany({
        where: {
          accountUserId: user.accountUser.id,
        },
      });

      return accountPermissions.map(ap => ({
        id: ap.id,
        name: ap.permissionName,
        resource: ap.resource,
        action: ap.action,
        scope: ap.scope,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

// Common permission constants
export const PERMISSIONS = {
  TICKETS: {
    VIEW: { resource: "tickets", action: "view" },
    CREATE: { resource: "tickets", action: "create" },
    UPDATE: { resource: "tickets", action: "update" },
    DELETE: { resource: "tickets", action: "delete" },
  },
  TIME_ENTRIES: {
    VIEW: { resource: "time-entries", action: "view" },
    CREATE: { resource: "time-entries", action: "create" },
    UPDATE: { resource: "time-entries", action: "update" },
    DELETE: { resource: "time-entries", action: "delete" },
    APPROVE: { resource: "time-entries", action: "approve" },
    REJECT: { resource: "time-entries", action: "reject" },
  },
  ACCOUNTS: {
    VIEW: { resource: "accounts", action: "view" },
    CREATE: { resource: "accounts", action: "create" },
    UPDATE: { resource: "accounts", action: "update" },
    DELETE: { resource: "accounts", action: "delete" },
  },
  BILLING: {
    VIEW: { resource: "billing", action: "view" },
    CREATE: { resource: "billing", action: "create" },
    UPDATE: { resource: "billing", action: "update" },
    DELETE: { resource: "billing", action: "delete" },
  },
  REPORTS: {
    VIEW: { resource: "reports", action: "view" },
  },
  SETTINGS: {
    VIEW: { resource: "settings", action: "view" },
    UPDATE: { resource: "settings", action: "update" },
  },
  USERS: {
    VIEW: { resource: "users", action: "view" },
    CREATE: { resource: "users", action: "create" },
    UPDATE: { resource: "users", action: "update" },
    DELETE: { resource: "users", action: "delete" },
    INVITE: { resource: "users", action: "invite" },
    MANAGE: { resource: "users", action: "manage" },
    CREATE_MANUAL: { resource: "users", action: "create-manual" },
    RESEND_INVITATION: { resource: "users", action: "resend-invitation" },
  },
  EMAIL: {
    SEND: { resource: "email", action: "send" },
    TEMPLATES: { resource: "email", action: "templates" },
    SETTINGS: { resource: "email", action: "settings" },
    QUEUE: { resource: "email", action: "queue" },
  },
} as const;