import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/email/stats
 * Get global email processing statistics
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalIntegrations,
      activeIntegrations,
      totalMessages,
      processedToday,
      ticketsCreated,
      threatsBlocked
    ] = await Promise.all([
      // Total integrations
      prisma.emailIntegration.count(),
      
      // Active integrations
      prisma.emailIntegration.count({
        where: { isActive: true }
      }),
      
      // Total messages
      prisma.emailMessage.count(),
      
      // Messages processed today
      prisma.emailMessage.count({
        where: {
          createdAt: { gte: today }
        }
      }),
      
      // Tickets created from email
      prisma.ticket.count({
        where: {
          emailMessages: {
            some: {}
          }
        }
      }),
      
      // Security threats blocked (from security logs)
      prisma.emailSecurityLog.count({
        where: {
          action: { in: ['QUARANTINE', 'BLOCK', 'DELETE'] },
          riskLevel: { in: ['HIGH', 'CRITICAL'] },
          timestamp: { gte: today }
        }
      })
    ]);

    // Calculate average processing time from recent logs
    const recentLogs = await prisma.emailProcessingLog.findMany({
      where: {
        processingTime: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: { processingTime: true }
    });

    const averageProcessingTime = recentLogs.length > 0
      ? Math.round(recentLogs.reduce((sum, log) => sum + (log.processingTime || 0), 0) / recentLogs.length)
      : 0;

    const stats = {
      totalIntegrations,
      activeIntegrations,
      totalMessages,
      processedToday,
      ticketsCreated,
      threatsBlocked,
      averageProcessingTime
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Email stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}