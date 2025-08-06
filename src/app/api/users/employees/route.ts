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

    // Get users who have system-level permissions (likely employees/admins)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { memberships: { none: {} } }, // Users with no account memberships (system users)
          {
            memberships: {
              some: {
                roles: {
                  some: {
                    role: {
                      inheritAllPermissions: true // Super admins
                    }
                  }
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
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
                    inheritAllPermissions: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: "asc" },
    });

    // Transform to include whether user is a super admin
    const usersWithRoles = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      memberships: user.memberships,
      isSuperAdmin: user.memberships.some(m => 
        m.roles.some(r => r.role.inheritAllPermissions)
      )
    }));

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}