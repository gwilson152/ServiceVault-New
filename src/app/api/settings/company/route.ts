import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view settings
    const canViewSettings = await hasPermission(session.user.id, {
      resource: 'settings',
      action: 'read'
    });

    if (!canViewSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company information from system settings
    const companySettings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: [
            'company_name',
            'company_address',
            'company_city',
            'company_state',
            'company_zip_code',
            'company_country',
            'company_phone',
            'company_email',
            'company_website',
            'company_currency',
            'company_tax_id',
            'company_description'
          ]
        }
      }
    });

    // Convert to object format
    const companyInfo = companySettings.reduce((acc, setting) => {
      const key = setting.key.replace('company_', '');
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error('Error fetching company settings:', error);
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
    const canUpdateSettings = await hasPermission(session.user.id, {
      resource: 'settings',
      action: 'update'
    });

    if (!canUpdateSettings) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      companyName,
      address,
      city,
      state,
      zipCode,
      country,
      phone,
      email,
      website,
      currency,
      taxId,
      description
    } = body;

    // Map of form fields to database keys
    const settingsMap = {
      companyName: 'company_name',
      address: 'company_address',
      city: 'company_city',
      state: 'company_state',
      zipCode: 'company_zip_code',
      country: 'company_country',
      phone: 'company_phone',
      email: 'company_email',
      website: 'company_website',
      currency: 'company_currency',
      taxId: 'company_tax_id',
      description: 'company_description'
    };

    // Use transaction to update all settings
    await prisma.$transaction(async (tx) => {
      for (const [formKey, dbKey] of Object.entries(settingsMap)) {
        const value = body[formKey];
        if (value !== undefined && value !== null) {
          await tx.systemSettings.upsert({
            where: { key: dbKey },
            update: { 
              value: String(value),
              updatedAt: new Date()
            },
            create: {
              key: dbKey,
              value: String(value),
              description: `Company ${formKey} setting`
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving company settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}