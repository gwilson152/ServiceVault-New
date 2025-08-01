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

    // Only admins can view all permissions
    // Check permission for system admin operations
    const canAdminSystem = await hasPermission(session.user.id, { resource: "system", action: "admin" });
    if (!canAdminSystem) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
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

    // Only admins can create permissions
    // Check permission for system admin operations
    const canAdminSystem = await hasPermission(session.user.id, { resource: "system", action: "admin" });
    if (!canAdminSystem) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, resource, action } = body;

    if (!name || !resource || !action) {
      return NextResponse.json(
        { error: "Name, resource, and action are required" },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        description: description || null,
        resource,
        action,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    console.error("Error creating permission:", error);
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 }
    );
  }
}