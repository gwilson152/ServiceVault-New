import { NextResponse } from "next/server";
import { settingsService } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import type { SetupStatus } from "@/types/setup";

// GET /api/setup/status - Check if initial setup is required
export async function GET() {
  try {
    // Check if any users exist in the database
    const userCount = await prisma.user.count();
    const hasUsers = userCount > 0;

    // Check if any admin users exist specifically
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    const hasAdminUsers = adminCount > 0;

    // Check if core system settings exist
    const hasSystemSettings = await settingsService.get('system.setupCompleted', false);

    // Setup is required if NO users exist, regardless of settings
    const setupCompleted = hasUsers && hasAdminUsers && hasSystemSettings;
    const setupCompletedAt = setupCompleted 
      ? await settingsService.get('system.setupCompletedAt', null)
      : null;

    const status: SetupStatus = {
      isSetupRequired: !hasUsers, // Setup required only if no users exist
      hasAdminUsers,
      hasSystemSettings: !!hasSystemSettings,
      setupCompleted,
      setupCompletedAt
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking setup status:", error);
    
    // On error, default to requiring setup for safety
    const errorStatus: SetupStatus = {
      isSetupRequired: true,
      hasAdminUsers: false,
      hasSystemSettings: false,
      setupCompleted: false
    };

    return NextResponse.json(errorStatus);
  }
}