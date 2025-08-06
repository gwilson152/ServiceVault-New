import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ImportStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view import executions
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const configurationId = searchParams.get('configurationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let where: any = {};

    if (configurationId) {
      where.configurationId = configurationId;
    }

    if (status && Object.values(ImportStatus).includes(status as ImportStatus)) {
      where.status = status;
    }

    const [executions, total] = await Promise.all([
      prisma.importExecution.findMany({
        where,
        include: {
          configuration: {
            select: {
              id: true,
              name: true,
              targetEntity: true,
              sourceType: true
            }
          },
          _count: {
            select: {
              logs: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.importExecution.count({ where })
    ]);

    // Augment with executor information
    const executionsWithExecutor = await Promise.all(
      executions.map(async (execution) => {
        const executor = await prisma.user.findUnique({
          where: { id: execution.executedBy },
          select: { id: true, name: true, email: true }
        });
        
        return {
          ...execution,
          executor: executor || { id: execution.executedBy, name: 'Unknown User', email: null }
        };
      })
    );

    return NextResponse.json({
      executions: executionsWithExecutor,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching import executions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}