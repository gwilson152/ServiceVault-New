import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";
import { applyPermissionFilter } from "@/lib/permissions/withPermissions";

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
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    if (accountId) {
      whereClause.accountId = accountId;
    }
    
    // Filter by active status
    if (!includeInactive) {
      whereClause.invitationStatus = { not: "INACTIVE" };
    }

    // Build base query
    const query = {
      where: whereClause,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        },
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
          select: {
            id: true,
            name: true,
            permissions: true,
            inheritAllPermissions: true
          }
        }
      },
      orderBy: [
        { account: { name: "asc" as const } },
        { user: { name: "asc" as const } }
      ]
    };

    // Apply permission filtering to only show memberships for accounts user has access to
    const filteredQuery = await applyPermissionFilter(
      session.user.id,
      "account-memberships",
      query,
      "accountId"
    );

    const memberships = await prisma.accountMembership.findMany(filteredQuery);

    // Transform to maintain backward compatibility if needed
    const accountUsers = memberships.map(membership => ({
      id: membership.id,
      accountId: membership.accountId,
      userId: membership.userId,
      account: membership.account,
      user: membership.user,
      roles: membership.roles,
      invitationStatus: membership.invitationStatus,
      invitedAt: membership.invitedAt,
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      // Legacy fields for compatibility
      isActive: membership.invitationStatus === "ACCEPTED",
      permissions: membership.roles.flatMap(role => role.permissions)
    }));

    return NextResponse.json({ accountUsers });
  } catch (error) {
    console.error("Error fetching account users:", error);
    return NextResponse.json(
      { error: "Failed to fetch account users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, userId, roleIds } = body;

    if (!accountId || !userId) {
      return NextResponse.json(
        { error: "Account ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check permission to manage users for this account
    const canManageUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "manage",
      accountId
    });
    
    if (!canManageUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user already has membership to this account
    const existingMembership = await prisma.accountMembership.findUnique({
      where: {
        userId_accountId: {
          userId,
          accountId
        }
      }
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User already has membership to this account" },
        { status: 400 }
      );
    }

    // Verify account and user exist
    const [account, user] = await Promise.all([
      prisma.account.findUnique({ where: { id: accountId } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify role IDs exist if provided
    if (roleIds?.length > 0) {
      const existingRoles = await prisma.roleTemplate.findMany({
        where: { id: { in: roleIds } },
        select: { id: true }
      });
      
      if (existingRoles.length !== roleIds.length) {
        const existingIds = existingRoles.map(r => r.id);
        const missingIds = roleIds.filter((id: string) => !existingIds.includes(id));
        return NextResponse.json(
          { error: `Role templates not found: ${missingIds.join(', ')}` },
          { status: 404 }
        );
      }
    }

    // Create account membership
    const membership = await prisma.accountMembership.create({
      data: {
        accountId,
        userId,
        ...(roleIds?.length > 0 && {
          roles: {
            create: roleIds.map((roleId: string) => ({
              roleId
            }))
          }
        })
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error("Error creating account membership:", error);
    return NextResponse.json(
      { error: "Failed to create account membership" },
      { status: 500 }
    );
  }
}