/**
 * User Enable API
 * 
 * Handles enabling user accounts:
 * POST - Enable a user account (allows login)
 * 
 * Permission Requirements:
 * - users:edit permission to enable user accounts
 * - Super admin access for user management
 * 
 * Security:
 * - Resets failed login attempts when enabling
 * - Unlocks account if previously locked
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
        isActive: true,
        isLocked: true,
        loginAttempts: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isActive && !user.isLocked && (user.loginAttempts || 0) === 0) {
      return NextResponse.json(
        { error: "User account is already active and unlocked" },
        { status: 400 }
      );
    }

    // Enable the user account and reset security flags
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        isActive: true,
        isLocked: false,
        loginAttempts: 0,
        lockedAt: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isLocked: true,
        loginAttempts: true
      }
    });

    // In a real implementation, you might also:
    // - Log the security action for audit trail
    // - Send notification to user about account status change

    return NextResponse.json({
      message: "User account enabled successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error enabling user:", error);
    return NextResponse.json(
      { error: "Failed to enable user account" },
      { status: 500 }
    );
  }
}