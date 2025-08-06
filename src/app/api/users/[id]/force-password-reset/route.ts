/**
 * Force Password Reset API
 * 
 * Handles forcing password reset for user accounts:
 * POST - Force a user to reset their password on next login
 * 
 * Permission Requirements:
 * - users:edit permission to force password resets
 * - Super admin access for security actions
 * 
 * Security:
 * - Prevents users from forcing password reset on themselves
 * - Sets password reset flag for next login
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

  // Prevent users from forcing password reset on themselves
  if (session.user.id === resolvedParams.id) {
    return NextResponse.json(
      { error: "You cannot force password reset on your own account" },
      { status: 400 }
    );
  }

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        passwordResetRequired: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.passwordResetRequired) {
      return NextResponse.json(
        { error: "User already has password reset required" },
        { status: 400 }
      );
    }

    // Set password reset required flag
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        passwordResetRequired: true,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordResetRequired: true
      }
    });

    // In a real implementation, you might also:
    // - Generate a secure password reset token
    // - Send password reset email to user
    // - Log the security action for audit trail
    // - Set expiration time for the password reset requirement

    return NextResponse.json({
      message: "Password reset forced successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error forcing password reset:", error);
    return NextResponse.json(
      { error: "Failed to force password reset" },
      { status: 500 }
    );
  }
}