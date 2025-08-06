import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view billing rates for this account
    const canViewBilling = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'billing',
      action: 'view',
      accountId: resolvedParams.id
    });

    if (!canViewBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get account-specific billing rates with fallback to system defaults
    const account = await prisma.account.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get all billing rates with account overrides
    const systemRates = await prisma.billingRate.findMany({
      orderBy: { name: 'asc' },
      include: {
        accountRates: {
          where: { accountId: resolvedParams.id },
          select: {
            id: true,
            rate: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    // Transform to include effective rates (account override or system default)
    const effectiveRates = systemRates.map(systemRate => {
      const accountOverride = systemRate.accountRates[0]; // Should be only one per account
      
      return {
        id: systemRate.id,
        name: systemRate.name,
        description: systemRate.description,
        systemRate: systemRate.rate,
        accountRate: accountOverride?.rate,
        effectiveRate: accountOverride?.rate ?? systemRate.rate,
        hasOverride: !!accountOverride,
        overrideId: accountOverride?.id,
        isDefault: systemRate.isDefault,
        lastUpdated: accountOverride?.updatedAt ?? systemRate.updatedAt
      };
    });

    return NextResponse.json({
      account,
      billingRates: effectiveRates
    });
  } catch (error) {
    console.error('Error fetching account billing rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to edit billing rates for this account
    const canEditBilling = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'billing',
      action: 'edit',
      accountId: resolvedParams.id
    });

    if (!canEditBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { billingRateId, rate } = body;

    // Validation
    if (!billingRateId || typeof billingRateId !== 'string') {
      return NextResponse.json({ error: 'Valid billing rate ID is required' }, { status: 400 });
    }

    if (typeof rate !== 'number' || rate < 0) {
      return NextResponse.json({ error: 'Valid rate amount is required' }, { status: 400 });
    }

    if (rate > 10000) { // Reasonable upper limit
      return NextResponse.json({ error: 'Rate cannot exceed $10,000 per hour' }, { status: 400 });
    }

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, name: true }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify billing rate exists
    const billingRate = await prisma.billingRate.findUnique({
      where: { id: billingRateId },
      select: { id: true, name: true, rate: true }
    });

    if (!billingRate) {
      return NextResponse.json({ error: 'Billing rate not found' }, { status: 404 });
    }

    // Create or update account billing rate override
    const accountBillingRate = await prisma.accountBillingRate.upsert({
      where: {
        accountId_billingRateId: {
          accountId: resolvedParams.id,
          billingRateId: billingRateId
        }
      },
      update: {
        rate: rate
      },
      create: {
        accountId: resolvedParams.id,
        billingRateId: billingRateId,
        rate: rate
      }
    });

    return NextResponse.json({
      accountBillingRate,
      message: `Billing rate override created: ${billingRate.name} at $${rate}/hour for ${account.name}`
    });
  } catch (error) {
    console.error('Error creating account billing rate override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to edit billing rates for this account
    const canEditBilling = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'billing',
      action: 'edit',
      accountId: resolvedParams.id
    });

    if (!canEditBilling) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const billingRateId = searchParams.get('billingRateId');

    if (!billingRateId) {
      return NextResponse.json({ error: 'Billing rate ID is required' }, { status: 400 });
    }

    // Find and delete the account billing rate override
    const existingOverride = await prisma.accountBillingRate.findUnique({
      where: {
        accountId_billingRateId: {
          accountId: resolvedParams.id,
          billingRateId: billingRateId
        }
      },
      include: {
        account: { select: { name: true } },
        billingRate: { select: { name: true, rate: true } }
      }
    });

    if (!existingOverride) {
      return NextResponse.json({ error: 'Billing rate override not found' }, { status: 404 });
    }

    await prisma.accountBillingRate.delete({
      where: {
        accountId_billingRateId: {
          accountId: resolvedParams.id,
          billingRateId: billingRateId
        }
      }
    });

    return NextResponse.json({
      message: `Billing rate override removed for ${existingOverride.billingRate.name}. Will now use system default of $${existingOverride.billingRate.rate}/hour.`
    });
  } catch (error) {
    console.error('Error deleting account billing rate override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}