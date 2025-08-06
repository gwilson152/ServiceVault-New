import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    // Get all users with their system roles and account memberships
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
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
        memberships: accountId ? {
          where: {
            accountId: accountId
          },
          include: {
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
        } : {
          include: {
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

    // Filter users who have tickets:assignable-to permission
    const assignableUsers = [];
    
    for (const user of users) {
      const hasAssignablePermission = await permissionService.hasPermission({
        userId: user.id,
        resource: "tickets",
        action: "assignable-to",
        ...(accountId && { accountId })
      });
      
      if (hasAssignablePermission) {
        // Get user's primary role for display
        let primaryRole = "User";
        if (user.systemRoles.length > 0) {
          primaryRole = user.systemRoles[0].role.name;
        } else if (user.memberships.length > 0 && user.memberships[0].roles.length > 0) {
          primaryRole = user.memberships[0].roles[0].role.name;
        }

        assignableUsers.push({
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: primaryRole,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      }
    }

    // Sort by name for consistent ordering
    assignableUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ assignableUsers });
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignable users" },
      { status: 500 }
    );
  }
}