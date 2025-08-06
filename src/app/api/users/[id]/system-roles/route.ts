import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check permission to manage users
    const canManageUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "edit"
    });

    if (!canManageUsers) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the role template exists
    const roleTemplate = await prisma.roleTemplate.findUnique({
      where: { id: roleId }
    });

    if (!roleTemplate) {
      return NextResponse.json({ error: "Role template not found" }, { status: 404 });
    }

    // Check if the user already has this system role
    const existingSystemRole = await prisma.systemRole.findFirst({
      where: {
        userId: resolvedParams.id,
        roleId: roleId
      }
    });

    if (existingSystemRole) {
      return NextResponse.json({ error: "User already has this system role" }, { status: 400 });
    }

    // For super admin roles, ensure only super admins can assign them
    if (roleTemplate.inheritAllPermissions) {
      const isSuperAdmin = await permissionService.isSuperAdmin(session.user.id);
      if (!isSuperAdmin) {
        return NextResponse.json({ 
          error: "Only super administrators can assign super admin system roles" 
        }, { status: 403 });
      }
    }

    // Create the system role assignment
    const systemRole = await prisma.systemRole.create({
      data: {
        userId: resolvedParams.id,
        roleId: roleId
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            inheritAllPermissions: true,
            permissions: true
          }
        }
      }
    });

    return NextResponse.json(systemRole, { status: 201 });

  } catch (error) {
    console.error("Error adding system role:", error);
    return NextResponse.json(
      { error: "Failed to add system role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { roleId } = await request.json();

    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    // Check permission to manage users
    const canManageUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "edit"
    });

    if (!canManageUsers) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the system role assignment
    const systemRole = await prisma.systemRole.findFirst({
      where: {
        userId: resolvedParams.id,
        roleId: roleId
      },
      include: {
        role: true
      }
    });

    if (!systemRole) {
      return NextResponse.json({ error: "System role assignment not found" }, { status: 404 });
    }

    // For super admin roles, ensure only super admins can remove them
    if (systemRole.role.inheritAllPermissions) {
      const isSuperAdmin = await permissionService.isSuperAdmin(session.user.id);
      if (!isSuperAdmin) {
        return NextResponse.json({ 
          error: "Only super administrators can remove super admin system roles" 
        }, { status: 403 });
      }
    }

    // Prevent removing the last super admin system role
    if (systemRole.role.inheritAllPermissions) {
      const superAdminCount = await prisma.systemRole.count({
        where: {
          role: {
            inheritAllPermissions: true
          }
        }
      });

      if (superAdminCount === 1) {
        return NextResponse.json({ 
          error: "Cannot remove the last super administrator system role" 
        }, { status: 400 });
      }
    }

    // Remove the system role assignment
    await prisma.systemRole.delete({
      where: {
        id: systemRole.id
      }
    });

    return NextResponse.json({ message: "System role removed successfully" });

  } catch (error) {
    console.error("Error removing system role:", error);
    return NextResponse.json(
      { error: "Failed to remove system role" },
      { status: 500 }
    );
  }
}