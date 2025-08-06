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

    if (!accountId) {
      return NextResponse.json({ error: "accountId parameter is required" }, { status: 400 });
    }

    // Get account memberships for the specified account
    const memberships = await prisma.accountMembership.findMany({
      where: { accountId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true
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
    });

    // Filter memberships where the user has tickets:assignable-for permission
    const assignableForUsers = [];
    
    for (const membership of memberships) {
      if (!membership.user) continue; // Skip memberships without users (pending invitations)

      const canBeAssignedFor = await permissionService.hasPermission({
        userId: membership.user.id,
        resource: "tickets",
        action: "assignable-for",
        accountId
      });
      
      if (canBeAssignedFor) {
        // Get user's primary role for display
        let primaryRole = "User";
        if (membership.roles.length > 0) {
          primaryRole = membership.roles[0].role.name;
        }

        assignableForUsers.push({
          membershipId: membership.id,
          userId: membership.user.id,
          name: membership.user.name || membership.user.email,
          email: membership.user.email,
          role: primaryRole,
          createdAt: membership.user.createdAt,
          updatedAt: membership.user.updatedAt,
        });
      }
    }

    // Sort by name for consistent ordering
    assignableForUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ accountUsers: assignableForUsers });
  } catch (error) {
    console.error("Error fetching assignable-for account users:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignable account users" },
      { status: 500 }
    );
  }
}