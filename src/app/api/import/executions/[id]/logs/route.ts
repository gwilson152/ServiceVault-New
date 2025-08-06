import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';
import { LogLevel } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view imports
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const executionId = params.id;
    const { searchParams } = new URL(request.url);
    const levelFilter = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter conditions
    const whereClause: any = {
      executionId
    };

    // Apply level filter
    if (levelFilter && levelFilter !== 'all') {
      if (levelFilter === 'ERROR') {
        whereClause.level = LogLevel.ERROR;
      } else if (levelFilter === 'WARN') {
        whereClause.level = { in: [LogLevel.WARN, LogLevel.ERROR] };
      } else if (levelFilter === 'INFO') {
        whereClause.level = { in: [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR] };
      } else if (levelFilter === 'DEBUG') {
        whereClause.level = { in: [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR] };
      }
    }

    // Get logs with filtering and pagination
    const logs = await prisma.importExecutionLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 1000), // Cap at 1000 to prevent huge responses
      skip: offset,
      select: {
        id: true,
        level: true,
        message: true,
        details: true,
        recordIndex: true,
        timestamp: true
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.importExecutionLog.count({
      where: whereClause
    });

    return NextResponse.json({
      logs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching execution logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution logs' },
      { status: 500 }
    );
  }
}