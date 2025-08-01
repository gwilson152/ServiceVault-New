import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensurePermissionExists, getDefaultPermissionsForRole, PERMISSIONS_REGISTRY } from "./permissions-registry";

export interface PermissionCheck {
  resource: string;
  action: string;
  scope?: "own" | "account" | "subsidiary";
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
      include: { accountUser: true }
    });

    if (!user) {
      return false;
    }

    // Check against default role permissions first
    const rolePermissions = getDefaultPermissionsForRole(user.role);
    const hasRolePermission = rolePermissions.some(p => 
      p.resource === permission.resource && p.action === permission.action
    );

    if (hasRolePermission) {
      return true;
    }

    // Account users can have additional specific permissions
    if (user.role === "ACCOUNT_USER" && user.accountUser) {
      const accountPermission = await prisma.accountPermission.findFirst({
        where: {
          accountUserId: user.accountUser.id,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope || "own",
        },
      });

      return !!accountPermission;
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
  },
  EMAIL: {
    SEND: { resource: "email", action: "send" },
    TEMPLATES: { resource: "email", action: "templates" },
    SETTINGS: { resource: "email", action: "settings" },
    QUEUE: { resource: "email", action: "queue" },
  },
} as const;