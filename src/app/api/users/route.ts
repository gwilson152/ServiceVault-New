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
    const role = searchParams.get("role");
    const excludeAccountUsers = searchParams.get("excludeAccountUsers") === "true";

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    
    if (role) {
      whereClause.role = role;
    }

    if (excludeAccountUsers) {
      whereClause.role = { not: "ACCOUNT_USER" };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" }
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}