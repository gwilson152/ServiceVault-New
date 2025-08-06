import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

// Helper function to get all descendant account IDs
async function getAccountAndDescendants(accountId: string): Promise<string[]> {
  const accountIds: string[] = [accountId];
  
  // Recursively get all child accounts
  const getChildren = async (parentId: string): Promise<void> => {
    const children = await prisma.account.findMany({
      where: { parentId },
      select: { id: true }
    });
    
    for (const child of children) {
      accountIds.push(child.id);
      await getChildren(child.id); // Recursively get grandchildren
    }
  };
  
  await getChildren(accountId);
  return accountIds;
}

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

    // Build where clause - if accountId is specified, include all descendant accounts
    const whereClause: Record<string, unknown> = {};
    if (accountId) {
      const accountAndDescendants = await getAccountAndDescendants(accountId);
      whereClause.accountId = { in: accountAndDescendants };
    }
    
    // Note: includeInactive is ignored since we don't have invitation status in current schema
    // All memberships are considered "active" once created

    // First, let's get the accessible account IDs for this user
    const permissions = await permissionService.getUserPermissions(session.user.id);
    let finalWhereClause = whereClause;
    
    if (!permissions.isSuperAdmin) {
      const accessibleAccountIds = await permissionService.getAccessibleAccountIds(session.user.id);
      if (accessibleAccountIds.length === 0) {
        // User has no account access
        return NextResponse.json({ accountUsers: [] });
      }
      
      // If we already have accountId filter from descendant lookup, intersect with accessible accounts
      if (whereClause.accountId && typeof whereClause.accountId === 'object' && 'in' in whereClause.accountId) {
        const requestedAccountIds = whereClause.accountId.in as string[];
        const allowedAccountIds = requestedAccountIds.filter(id => accessibleAccountIds.includes(id));
        finalWhereClause = {
          ...whereClause,
          accountId: { in: allowedAccountIds }
        };
      } else {
        // No specific account requested, use all accessible accounts
        finalWhereClause = {
          ...whereClause,
          accountId: { in: accessibleAccountIds }
        };
      }
    }

    // Execute the query directly without permission filter to avoid type issues
    const memberships = await prisma.accountMembership.findMany({
      where: finalWhereClause,
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
      },
      orderBy: [
        { account: { name: "asc" as const } },
        { user: { name: "asc" as const } }
      ]
    });

    // Transform to maintain backward compatibility if needed
    const accountUsers = memberships.map(membership => ({
      id: membership.id,
      accountId: membership.accountId,
      userId: membership.userId,
      account: membership.account,
      user: membership.user,
      roles: membership.roles.map(membershipRole => membershipRole.role),
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      // Legacy fields for compatibility with old components
      isActive: true, // All memberships are active in current schema
      invitationStatus: "ACCEPTED", // Simulate accepted status
      invitedAt: membership.createdAt,
      joinedAt: membership.createdAt,
      permissions: membership.roles.flatMap(membershipRole => membershipRole.role.permissions),
      // Additional fields for UI compatibility
      name: membership.user.name || membership.user.email,
      email: membership.user.email,
      hasLogin: true, // Assume users have login if they have memberships
      invitationToken: null,
      invitationExpiry: null
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