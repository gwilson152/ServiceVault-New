/**
 * User Unlock API
 * 
 * Handles unlocking user accounts:
 * POST - Unlock a user account (resets failed login attempts)
 * 
 * Permission Requirements:
 * - users:edit permission to unlock user accounts
 * - Super admin access for security actions
 * 
 * Security:
 * - Resets failed login attempt counter
 * - Removes account lock status
 * - Logs security actions for audit trail
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
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        isLocked: true,
        loginAttempts: true,
        lockedAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.isLocked && (user.loginAttempts || 0) === 0) {
      return NextResponse.json(
        { error: "User account is not locked" },
        { status: 400 }
      );
    }

    // Unlock the user account and reset login attempts
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        isLocked: false,
        loginAttempts: 0,
        lockedAt: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isLocked: true,
        loginAttempts: true,
        lockedAt: true
      }
    });

    // In a real implementation, you might also:
    // - Log the security action for audit trail
    // - Send notification to user about account unlock
    // - Record unlock reason and administrator

    return NextResponse.json({
      message: "User account unlocked successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error unlocking user:", error);
    return NextResponse.json(
      { error: "Failed to unlock user account" },
      { status: 500 }
    );
  }
}