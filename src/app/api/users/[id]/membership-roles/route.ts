/**
 * User Membership Roles API
 * 
 * Handles adding and removing roles from user account memberships:
 * POST - Add a role to a user's account membership
 * DELETE - Remove a role from a user's account membership
 * 
 * Permission Requirements:
 * - users:edit permission to modify user roles
 * - Super admin access for role assignments
 * 
 * Security:
 * - Validates user exists and has membership
 * - Prevents duplicate role assignments
 * - Ensures role template exists
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission to edit users
  const canEditUsers = await permissionService.hasPermission({
    userId: session.user.id,
    resource: "users",
    action: "edit"
  });

  if (!canEditUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { membershipId, roleId } = await request.json();

    if (!membershipId || !roleId) {
      return NextResponse.json(
        { error: "membershipId and roleId are required" },
        { status: 400 }
      );
    }

    // Verify the user exists and has this membership
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        memberships: {
          where: { id: membershipId },
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    // Check if role is already assigned
    const existingRole = membership.roles.find(r => r.role.id === roleId);
    if (existingRole) {
      return NextResponse.json(
        { error: "Role is already assigned to this membership" },
        { status: 400 }
      );
    }

    // Verify role template exists
    const roleTemplate = await prisma.roleTemplate.findUnique({
      where: { id: roleId }
    });

    if (!roleTemplate) {
      return NextResponse.json({ error: "Role template not found" }, { status: 404 });
    }

    // Add the role to the membership
    const membershipRole = await prisma.membershipRole.create({
      data: {
        membershipId,
        roleId,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            inheritAllPermissions: true
          }
        }
      }
    });

    return NextResponse.json(membershipRole);
  } catch (error) {
    console.error("Error adding role to membership:", error);
    return NextResponse.json(
      { error: "Failed to add role to membership" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission to edit users
  const canEditUsers = await permissionService.hasPermission({
    userId: session.user.id,
    resource: "users",
    action: "edit"
  });

  if (!canEditUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { membershipId, roleId } = await request.json();

    if (!membershipId || !roleId) {
      return NextResponse.json(
        { error: "membershipId and roleId are required" },
        { status: 400 }
      );
    }

    // Verify the membership role exists and belongs to this user
    const membershipRole = await prisma.membershipRole.findUnique({
      where: { id: roleId },
      include: {
        membership: {
          include: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!membershipRole) {
      return NextResponse.json(
        { error: "Role assignment not found" },
        { status: 404 }
      );
    }

    // Verify this membership role belongs to the correct user
    if (membershipRole.membership.user.id !== resolvedParams.id) {
      return NextResponse.json(
        { error: "Role assignment does not belong to this user" },
        { status: 403 }
      );
    }

    // Verify the membership ID matches
    if (membershipRole.membershipId !== membershipId) {
      return NextResponse.json(
        { error: "Role assignment does not belong to the specified membership" },
        { status: 400 }
      );
    }

    // Remove the role from the membership
    await prisma.membershipRole.delete({
      where: { id: roleId }
    });

    return NextResponse.json({ message: "Role removed successfully" });
  } catch (error) {
    console.error("Error removing role from membership:", error);
    return NextResponse.json(
      { error: "Failed to remove role from membership" },
      { status: 500 }
    );
  }
}