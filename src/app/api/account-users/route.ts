import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view users
    const canViewUsers = await hasPermission(session.user.id, { resource: "users", action: "view" });
    if (!canViewUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const activeOnly = searchParams.get("activeOnly"); // For assignment contexts
    const includeInactive = searchParams.get("includeInactive"); // For admin/management contexts

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    if (accountId) {
      whereClause.accountId = accountId;
    }
    
    // Filter by active status
    if (activeOnly === "true" || (!includeInactive && !activeOnly)) {
      // Default to active only unless explicitly requesting inactive users
      whereClause.isActive = true;
    }

    const accountUsers = await prisma.accountUser.findMany({
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
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });

    // Add computed status information
    const accountUsersWithStatus = accountUsers.map(accountUser => ({
      ...accountUser,
      // Add status indicators
      hasLogin: !!accountUser.user, // Whether they've activated their account
      canBeAssigned: accountUser.isActive, // Whether they can receive ticket assignments
      invitationStatus: accountUser.user ? 'activated' : 
                       accountUser.invitationToken ? 'pending' : 'none'
    }));

    return NextResponse.json(accountUsersWithStatus);
  } catch (error) {
    console.error("Error fetching account users:", error);
    return NextResponse.json(
      { error: "Failed to fetch account users" },
      { status: 500 }
    );
  }
}