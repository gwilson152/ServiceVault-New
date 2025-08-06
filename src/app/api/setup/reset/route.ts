import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { settingsService } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has system admin permissions
    const canResetSetup = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "system",
      action: "admin"
    });

    if (!canResetSetup) {
      return NextResponse.json({ error: 'Forbidden: System admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const { confirmationText } = body;

    if (confirmationText !== "RERUN SETUP") {
      return NextResponse.json({ 
        error: 'Invalid confirmation text' 
      }, { status: 400 });
    }

    // Reset the setup completion flags in SystemSettings
    await settingsService.delete('system.setupCompleted');
    await settingsService.delete('system.setupCompletedAt');

    console.log(`🔄 Setup reset by user ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Setup has been reset. You can now re-run the initial setup wizard.",
      resetBy: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      resetAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resetting setup:', error);
    return NextResponse.json(
      { error: 'Failed to reset setup' },
      { status: 500 }
    );
  }
}