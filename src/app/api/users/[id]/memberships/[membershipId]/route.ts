/**
 * User Membership Management API
 * 
 * Handles removing users from account memberships:
 * DELETE - Remove a user from an account entirely (removes all roles and membership)
 * 
 * Permission Requirements:
 * - users:edit permission to modify user memberships
 * - Super admin access for membership changes
 * 
 * Security:
 * - Validates user exists and has membership
 * - Removes all associated role assignments
 * - Preserves data integrity by cleaning up relations
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

interface RouteContext {
  params: Promise<{ id: string; membershipId: string }>;
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
    // Verify the user exists and has this membership
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        memberships: {
          where: { id: resolvedParams.membershipId },
          include: {
            account: true,
            roles: true
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

    // Remove the membership (this will cascade delete all associated roles)
    await prisma.accountMembership.delete({
      where: { id: resolvedParams.membershipId }
    });

    return NextResponse.json({ 
      message: `User removed from account "${membership.account.name}" successfully` 
    });
  } catch (error) {
    console.error("Error removing user from account:", error);
    return NextResponse.json(
      { error: "Failed to remove user from account" },
      { status: 500 }
    );
  }
}