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

    const searchParams = request.nextUrl.searchParams;
    const accountUserId = searchParams.get("accountUserId");

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = {};

    if (session.user?.role === "ACCOUNT_USER") {
      // Account users can only see their own permissions
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: true }
      });
      
      if (!user?.accountUser) {
        return NextResponse.json({ error: "Account user not found" }, { status: 404 });
      }
      
      whereClause.accountUserId = user.accountUser.id;
    } else if (accountUserId) {
      // Admins and employees can filter by account user
      whereClause.accountUserId = accountUserId;
    }

    const accountPermissions = await prisma.accountPermission.findMany({
      where: whereClause,
      orderBy: { permissionName: "asc" },
    });

    return NextResponse.json(accountPermissions);
  } catch (error) {
    console.error("Error fetching account permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch account permissions" },
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

    // Only admins can create account permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { accountUserId, permissionName, resource, action, scope } = body;

    if (!accountUserId || !permissionName || !resource || !action) {
      return NextResponse.json(
        { error: "Account user ID, permission name, resource, and action are required" },
        { status: 400 }
      );
    }

    const accountPermission = await prisma.accountPermission.create({
      data: {
        accountUserId,
        permissionName,
        resource,
        action,
        scope: scope || "own",
      },
    });

    return NextResponse.json(accountPermission, { status: 201 });
  } catch (error) {
    console.error("Error creating account permission:", error);
    return NextResponse.json(
      { error: "Failed to create account permission" },
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

    // Only admins can delete account permissions
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

    await prisma.accountPermission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account permission:", error);
    return NextResponse.json(
      { error: "Failed to delete account permission" },
      { status: 500 }
    );
  }
}