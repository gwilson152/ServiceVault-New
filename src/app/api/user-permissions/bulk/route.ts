import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface BulkPermissionAssignment {
  userId: string;
  permissions: Array<{
    permissionName: string;
    resource: string;
    action: string;
    scope?: string;
  }>;
}

interface BulkUserAssignment {
  permissionName: string;
  resource: string;
  action: string;
  scope?: string;
  userIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create bulk user permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, assignments } = body;

    if (!type || !assignments || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: "Type and assignments array are required" },
        { status: 400 }
      );
    }

    const results = [];

    if (type === "user-permissions") {
      // Assign multiple permissions to one user
      const userAssignments = assignments as BulkPermissionAssignment[];
      
      for (const assignment of userAssignments) {
        // Verify user exists and is not ACCOUNT_USER
        const user = await prisma.user.findUnique({
          where: { id: assignment.userId },
          select: { role: true }
        });

        if (!user) {
          continue; // Skip invalid users
        }

        if (user.role === "ACCOUNT_USER") {
          continue; // Skip account users
        }

        // Create permissions for this user
        const userPermissions = await Promise.allSettled(
          assignment.permissions.map(permission =>
            prisma.userPermission.upsert({
              where: {
                userId_permissionName: {
                  userId: assignment.userId,
                  permissionName: permission.permissionName
                }
              },
              update: {
                resource: permission.resource,
                action: permission.action,
                scope: permission.scope || "own"
              },
              create: {
                userId: assignment.userId,
                permissionName: permission.permissionName,
                resource: permission.resource,
                action: permission.action,
                scope: permission.scope || "own"
              }
            })
          )
        );

        results.push({
          userId: assignment.userId,
          successful: userPermissions.filter(p => p.status === "fulfilled").length,
          failed: userPermissions.filter(p => p.status === "rejected").length
        });
      }
    } else if (type === "permission-users") {
      // Assign one permission to multiple users
      const permissionAssignments = assignments as BulkUserAssignment[];
      
      for (const assignment of permissionAssignments) {
        // Verify users exist and are not ACCOUNT_USER
        const users = await prisma.user.findMany({
          where: { 
            id: { in: assignment.userIds },
            role: { not: "ACCOUNT_USER" }
          },
          select: { id: true }
        });

        const validUserIds = users.map(u => u.id);

        // Create permissions for all valid users
        const userPermissions = await Promise.allSettled(
          validUserIds.map(userId =>
            prisma.userPermission.upsert({
              where: {
                userId_permissionName: {
                  userId,
                  permissionName: assignment.permissionName
                }
              },
              update: {
                resource: assignment.resource,
                action: assignment.action,
                scope: assignment.scope || "own"
              },
              create: {
                userId,
                permissionName: assignment.permissionName,
                resource: assignment.resource,
                action: assignment.action,
                scope: assignment.scope || "own"
              }
            })
          )
        );

        results.push({
          permissionName: assignment.permissionName,
          requestedUsers: assignment.userIds.length,
          validUsers: validUserIds.length,
          successful: userPermissions.filter(p => p.status === "fulfilled").length,
          failed: userPermissions.filter(p => p.status === "rejected").length
        });
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'user-permissions' or 'permission-users'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      type,
      results,
      summary: {
        totalAssignments: assignments.length,
        processedResults: results.length
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating bulk user permissions:", error);
    return NextResponse.json(
      { error: "Failed to create bulk user permissions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete bulk user permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, targets } = body;

    if (!type || !targets || !Array.isArray(targets)) {
      return NextResponse.json(
        { error: "Type and targets array are required" },
        { status: 400 }
      );
    }

    let deleteCount = 0;

    if (type === "user-permissions") {
      // Delete multiple permissions for specified users
      const userIds = targets as string[];
      const result = await prisma.userPermission.deleteMany({
        where: {
          userId: { in: userIds }
        }
      });
      deleteCount = result.count;
    } else if (type === "permission-ids") {
      // Delete specific permission IDs
      const permissionIds = targets as string[];
      const result = await prisma.userPermission.deleteMany({
        where: {
          id: { in: permissionIds }
        }
      });
      deleteCount = result.count;
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'user-permissions' or 'permission-ids'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      deleted: deleteCount,
      type 
    });

  } catch (error) {
    console.error("Error deleting bulk user permissions:", error);
    return NextResponse.json(
      { error: "Failed to delete bulk user permissions" },
      { status: 500 }
    );
  }
}