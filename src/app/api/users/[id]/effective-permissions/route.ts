/**
 * User Effective Permissions API
 * 
 * Provides comprehensive view of all effective permissions for a user:
 * GET - Calculate and return all permissions user has through account memberships and system roles
 * 
 * Permission Requirements:
 * - users:view permission to view user permissions
 * - Super admin access for comprehensive permission views
 * 
 * Security:
 * - Only shows permissions for authorized viewers
 * - Calculates permissions from all sources (system roles + account memberships)
 * - Deduplicates and organizes permissions by resource
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Permission {
  resource: string;
  action: string;
  scope: string;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission to view users
  const canViewUsers = await permissionService.hasPermission({
    userId: session.user.id,
    resource: "users",
    action: "view"
  });

  if (!canViewUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get user with all their roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        systemRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: true,
                inheritAllPermissions: true
              }
            }
          }
        },
        memberships: {
          include: {
            account: {
              select: {
                id: true,
                name: true
              }
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const allPermissions: Permission[] = [];

    // Collect system role permissions
    user.systemRoles.forEach(systemRole => {
      if (systemRole.role.inheritAllPermissions) {
        // Super admin has all permissions - return a representative set
        allPermissions.push(
          { resource: "system", action: "admin", scope: "GLOBAL" },
          { resource: "users", action: "view", scope: "GLOBAL" },
          { resource: "users", action: "edit", scope: "GLOBAL" },
          { resource: "users", action: "delete", scope: "GLOBAL" },
          { resource: "accounts", action: "view", scope: "GLOBAL" },
          { resource: "accounts", action: "edit", scope: "GLOBAL" },
          { resource: "accounts", action: "delete", scope: "GLOBAL" },
          { resource: "tickets", action: "view", scope: "GLOBAL" },
          { resource: "tickets", action: "edit", scope: "GLOBAL" },
          { resource: "tickets", action: "delete", scope: "GLOBAL" },
          { resource: "time-entries", action: "view", scope: "GLOBAL" },
          { resource: "time-entries", action: "edit", scope: "GLOBAL" },
          { resource: "time-entries", action: "delete", scope: "GLOBAL" },
          { resource: "settings", action: "view", scope: "GLOBAL" },
          { resource: "settings", action: "edit", scope: "GLOBAL" },
          { resource: "billing", action: "view", scope: "GLOBAL" },
          { resource: "billing", action: "edit", scope: "GLOBAL" },
          { resource: "role-templates", action: "view", scope: "GLOBAL" },
          { resource: "role-templates", action: "edit", scope: "GLOBAL" }
        );
      } else {
        systemRole.role.permissions.forEach(permissionString => {
          const [resource, action] = permissionString.split(':');
          if (resource && action) {
            allPermissions.push({
              resource,
              action,
              scope: "GLOBAL"
            });
          }
        });
      }
    });

    // Collect membership role permissions
    user.memberships.forEach(membership => {
      membership.roles.forEach(membershipRole => {
        if (membershipRole.role.inheritAllPermissions) {
          // Super admin role at account level
          allPermissions.push(
            { resource: "accounts", action: "view", scope: membership.account.id },
            { resource: "accounts", action: "edit", scope: membership.account.id },
            { resource: "users", action: "view", scope: membership.account.id },
            { resource: "users", action: "edit", scope: membership.account.id },
            { resource: "tickets", action: "view", scope: membership.account.id },
            { resource: "tickets", action: "edit", scope: membership.account.id },
            { resource: "time-entries", action: "view", scope: membership.account.id },
            { resource: "time-entries", action: "edit", scope: membership.account.id },
            { resource: "billing", action: "view", scope: membership.account.id },
            { resource: "billing", action: "edit", scope: membership.account.id }
          );
        } else {
          membershipRole.role.permissions.forEach(permissionString => {
            const [resource, action] = permissionString.split(':');
            if (resource && action) {
              allPermissions.push({
                resource,
                action,
                scope: membership.account.id
              });
            }
          });
        }
      });
    });

    // Deduplicate permissions
    const uniquePermissions = allPermissions.filter((permission, index, self) =>
      index === self.findIndex(p =>
        p.resource === permission.resource &&
        p.action === permission.action &&
        p.scope === permission.scope
      )
    );

    // Sort permissions by resource, then action
    uniquePermissions.sort((a, b) => {
      if (a.resource !== b.resource) {
        return a.resource.localeCompare(b.resource);
      }
      return a.action.localeCompare(b.action);
    });

    return NextResponse.json(uniquePermissions);
  } catch (error) {
    console.error("Error fetching user effective permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user effective permissions" },
      { status: 500 }
    );
  }
}