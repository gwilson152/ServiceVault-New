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

    // Check permission to view import executions
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const execution = await prisma.importExecution.findUnique({
      where: { id: resolvedParams.id },
      include: {
        configuration: {
          select: {
            name: true,
            description: true,
            sourceType: true,
            targetEntity: true
          }
        },
        _count: {
          select: {
            logs: true
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Get creator information manually since we store executedBy as string
    const creator = await prisma.user.findUnique({
      where: { id: execution.executedBy },
      select: {
        name: true,
        email: true
      }
    });

    const executionWithCreator = {
      ...execution,
      creator: creator || { name: 'Unknown User', email: 'unknown@example.com' }
    };

    return NextResponse.json({
      execution: executionWithCreator
    });

  } catch (error) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution details' },
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

    // Check permission to execute imports (for cancelling)
    const canExecute = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'execute'
    });

    if (!canExecute) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const executionId = resolvedParams.id;
    const { action } = await request.json();

    if (action === 'cancel') {
      // Update execution status to cancelled
      const execution = await prisma.importExecution.findUnique({
        where: { id: executionId }
      });

      if (!execution) {
        return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
      }

      if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Can only cancel running or pending executions' },
          { status: 400 }
        );
      }

      await prisma.importExecution.update({
        where: { id: executionId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date()
        }
      });

      // Log the cancellation
      await prisma.importExecutionLog.create({
        data: {
          executionId,
          level: 'INFO',
          message: `Import execution cancelled by ${session.user.email}`,
          timestamp: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Execution cancelled'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating execution:', error);
    return NextResponse.json(
      { error: 'Failed to update execution' },
      { status: 500 }
    );
  }
}