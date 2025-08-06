import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { settingsService } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email settings permission
    const canViewEmailSettings = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "settings",
      action: "view"
    });

    if (!canViewEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get email settings using SettingsService
    const emailSettingKeys = [
      'email.smtpHost',
      'email.smtpPort', 
      'email.smtpUser',
      'email.smtpSecure',
      'email.fromAddress',
      'email.fromName',
      'email.enableEmailNotifications'
    ];

    const settings: Record<string, any> = {};
    
    for (const key of emailSettingKeys) {
      const value = await settingsService.get(key);
      if (value !== null) {
        settings[key] = value;
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check email settings permission
    const canUpdateEmailSettings = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "settings",
      action: "edit"
    });

    if (!canUpdateEmailSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    // Update email settings using SettingsService
    const updatedSettings: Record<string, any> = {};

    for (const [key, value] of Object.entries(settings)) {
      // Ensure the key starts with 'email.' for security
      if (!key.startsWith('email.')) {
        continue;
      }
      
      await settingsService.set(key, value);
      updatedSettings[key] = value;
    }

    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
  } catch (error) {
    console.error('Error creating email settings:', error);
    return NextResponse.json(
      { error: 'Failed to create email settings' },
      { status: 500 }
    );
  }
}

