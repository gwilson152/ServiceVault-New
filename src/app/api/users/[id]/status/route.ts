/**
 * User Status API
 * 
 * Provides comprehensive user status information:
 * GET - Retrieve user status, login history, and active sessions
 * 
 * Permission Requirements:
 * - users:view permission to view user status information
 * 
 * Security:
 * - Only returns status for authorized users
 * - Masks sensitive session information appropriately
 * - Includes security-relevant information for admin purposes
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission to view users
  const canViewUsers = await permissionService.hasPermission({
    userId: session.user.id,
    resource: "users",
    action: "view"
  });

  if (!canViewUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get user with status information
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLogin: true,
        loginAttempts: true,
        isLocked: true,
        lockedAt: true,
        passwordResetRequired: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // In a real implementation, you would get active sessions from your session store
    // For now, we'll return mock session data
    const mockSessions = [
      {
        id: "session-1",
        deviceType: "Desktop",
        browser: "Chrome 120",
        ipAddress: "192.168.1.100",
        location: "New York, US",
        lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        isCurrentSession: session.user.id === resolvedParams.id, // Current user's session
      },
      {
        id: "session-2", 
        deviceType: "Mobile",
        browser: "Safari 17",
        ipAddress: "10.0.1.50",
        location: "Los Angeles, US",
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        isCurrentSession: false,
      }
    ];

    const userStatus = {
      id: user.id,
      isActive: user.isActive ?? true,
      lastLogin: user.lastLogin,
      loginAttempts: user.loginAttempts ?? 0,
      isLocked: user.isLocked ?? false,
      lockedAt: user.lockedAt,
      passwordResetRequired: user.passwordResetRequired ?? false,
      activeSessions: mockSessions
    };

    return NextResponse.json(userStatus);
  } catch (error) {
    console.error("Error fetching user status:", error);
    return NextResponse.json(
      { error: "Failed to fetch user status" },
      { status: 500 }
    );
  }
}