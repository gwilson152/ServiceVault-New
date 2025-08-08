import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/email/integrations
 * Get all global email integrations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check global email admin permission
    const canAdminEmailGlobal = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin-global'
    });

    if (!canAdminEmailGlobal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const integrations = await prisma.emailIntegration.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Get message counts and stats for each integration
    const integrationsWithStats = await Promise.all(
      integrations.map(async (integration) => {
        const [messageCount, ticketCount, recentErrors] = await Promise.all([
          prisma.emailMessage.count({
            where: { integrationId: integration.id }
          }),
          prisma.ticket.count({
            where: {
              emailMessages: {
                some: { integrationId: integration.id }
              }
            }
          }),
          prisma.emailProcessingLog.count({
            where: {
              integrationId: integration.id,
              status: 'FAILED',
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          })
        ]);

        return {
          ...integration,
          messageCount,
          ticketCount,
          errorCount: recentErrors,
          status: integration.isActive ? 'CONNECTED' : 'DISABLED'
        };
      })
    );

    return NextResponse.json({
      integrations: integrationsWithStats,
      total: integrations.length
    });

  } catch (error) {
    console.error('Email integrations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email/integrations
 * Create a new global email integration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check global email admin permission
    const canAdminEmailGlobal = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'email',
      action: 'admin-global'
    });

    if (!canAdminEmailGlobal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, provider, providerConfig, processingRules, syncInterval, isActive } = body;

    // Validate required fields
    if (!name || !provider || !providerConfig) {
      return NextResponse.json(
        { error: 'Name, provider, and providerConfig are required' },
        { status: 400 }
      );
    }

    // Check for duplicate names
    const existingIntegration = await prisma.emailIntegration.findFirst({
      where: { name }
    });

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'An integration with this name already exists' },
        { status: 409 }
      );
    }

    const integration = await prisma.emailIntegration.create({
      data: {
        name,
        provider,
        providerConfig,
        processingRules: processingRules || {},
        syncInterval: syncInterval || 300,
        isActive: isActive ?? true
      }
    });

    return NextResponse.json({
      message: 'Email integration created successfully',
      integration
    });

  } catch (error) {
    console.error('Create email integration error:', error);
    return NextResponse.json(
      { error: 'Failed to create email integration' },
      { status: 500 }
    );
  }
}