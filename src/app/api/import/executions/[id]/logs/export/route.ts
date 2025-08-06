import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { prisma } from '@/lib/prisma';

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

    // Get execution details for filename
    const execution = await prisma.importExecution.findUnique({
      where: { id: executionId },
      include: {
        configuration: {
          select: { name: true }
        }
      }
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Get all logs for the execution
    const logs = await prisma.importExecutionLog.findMany({
      where: { executionId },
      orderBy: { timestamp: 'asc' },
      select: {
        level: true,
        message: true,
        details: true,
        recordIndex: true,
        timestamp: true
      }
    });

    // Create CSV content
    const csvHeaders = ['Timestamp', 'Level', 'Record Index', 'Message', 'Details'];
    const csvRows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.recordIndex !== null ? log.recordIndex.toString() : '',
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes in CSV
      log.details ? `"${log.details.replace(/"/g, '""')}"` : ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const configName = execution.configuration.name.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `import-logs-${configName}-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error exporting execution logs:', error);
    return NextResponse.json(
      { error: 'Failed to export execution logs' },
      { status: 500 }
    );
  }
}