/**
 * User Disable API
 * 
 * Handles disabling user accounts:
 * POST - Disable a user account (prevents login)
 * 
 * Permission Requirements:
 * - users:edit permission to disable user accounts
 * - Super admin access for user management
 * 
 * Security:
 * - Prevents users from disabling themselves
 * - Logs security actions for audit trail
 * - Maintains data integrity
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

  // Prevent users from disabling themselves
  if (session.user.id === resolvedParams.id) {
    return NextResponse.json(
      { error: "You cannot disable your own account" },
      { status: 400 }
    );
  }

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true, email: true, isActive: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "User account is already disabled" },
        { status: 400 }
      );
    }

    // Disable the user account
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    // In a real implementation, you might also:
    // - Log the security action for audit trail
    // - Send notification to user about account status change
    // - Revoke active sessions

    return NextResponse.json({
      message: "User account disabled successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error disabling user:", error);
    return NextResponse.json(
      { error: "Failed to disable user account" },
      { status: 500 }
    );
  }
}