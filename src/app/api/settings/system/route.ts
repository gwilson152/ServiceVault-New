import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view settings
    const canViewSettings = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "settings",
      action: "view"
    });

    if (!canViewSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get system settings
    const systemSettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: [
            'app_name',
            'app_description',
            'support_email',
            'system_timezone',
            'date_format',
            'system_language',
            'default_tax_rate',
            'enable_email_notifications',
            'enable_sms_notifications',
            'maintenance_mode'
          ]
        }
      }
    });

    // Convert to object format with proper types
    const settings = systemSettings.reduce((acc, setting) => {
      const key = setting.key.replace(/^(app_|system_)/, '');
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Handle different types based on key patterns
      let value: string | number | boolean = setting.value || '';
      
      // Boolean settings
      if (key.startsWith('enable_') || key === 'maintenance_mode') {
        value = setting.value === 'true';
      } 
      // Number settings
      else if (key === 'defaultTaxRate') {
        value = parseFloat(setting.value || '0') || 0;
      }
      
      acc[camelKey] = value;
      return acc;
    }, {} as Record<string, string | number | boolean>);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to update settings
    const canUpdateSettings = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "settings",
      action: "update"
    });

    if (!canUpdateSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      appName,
      appDescription,
      supportEmail,
      timezone,
      dateFormat,
      language,
      defaultTaxRate,
      enableEmailNotifications,
      enableSMSNotifications,
      maintenanceMode
    } = body;

    // Map of form fields to database keys
    const settingsMap = {
      appName: 'app_name',
      appDescription: 'app_description',
      supportEmail: 'support_email',
      timezone: 'system_timezone',
      dateFormat: 'date_format',
      language: 'system_language',
      defaultTaxRate: 'default_tax_rate',
      enableEmailNotifications: 'enable_email_notifications',
      enableSMSNotifications: 'enable_sms_notifications',
      maintenanceMode: 'maintenance_mode'
    };

    // Use transaction to update all settings
    await prisma.$transaction(async (tx) => {
      for (const [formKey, dbKey] of Object.entries(settingsMap)) {
        const value = body[formKey];
        if (value !== undefined && value !== null) {
          let stringValue: string;
          
          // Convert value to string
          if (typeof value === 'boolean') {
            stringValue = value ? 'true' : 'false';
          } else {
            stringValue = String(value);
          }

          await tx.systemSettings.upsert({
            where: { key: dbKey },
            update: { 
              value: stringValue,
              updatedAt: new Date()
            },
            create: {
              key: dbKey,
              value: stringValue,
              description: `System ${formKey} setting`
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving system settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}