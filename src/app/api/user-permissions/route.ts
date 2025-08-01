import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view user permissions, or users can view their own
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    
    if (userId) {
      whereClause.userId = userId;
    }

    // If filtering by role, first get users with that role
    let userIds: string[] | undefined;
    if (role) {
      const users = await prisma.user.findMany({
        where: { role: role as any },
        select: { id: true }
      });
      userIds = users.map(u => u.id);
      whereClause.userId = { in: userIds };
    }

    const userPermissions = await prisma.userPermission.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { user: { name: "asc" } },
        { permissionName: "asc" }
      ],
    });

    return NextResponse.json(userPermissions);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create user permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissionName, resource, action, scope } = body;

    if (!userId || !permissionName || !resource || !action) {
      return NextResponse.json(
        { error: "User ID, permission name, resource, and action are required" },
        { status: 400 }
      );
    }

    // Verify the user exists and is not an ACCOUNT_USER (they use AccountPermission)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.role === "ACCOUNT_USER") {
      return NextResponse.json(
        { error: "Account users should use account permissions instead" },
        { status: 400 }
      );
    }

    const userPermission = await prisma.userPermission.create({
      data: {
        userId,
        permissionName,
        resource,
        action,
        scope: scope || "own",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(userPermission, { status: 201 });
  } catch (error) {
    console.error("Error creating user permission:", error);
    return NextResponse.json(
      { error: "Failed to create user permission" },
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

    // Only admins can delete user permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Permission ID is required" },
        { status: 400 }
      );
    }

    await prisma.userPermission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user permission:", error);
    return NextResponse.json(
      { error: "Failed to delete user permission" },
      { status: 500 }
    );
  }
}