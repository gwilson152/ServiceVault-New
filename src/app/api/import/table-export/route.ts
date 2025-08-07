import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ConnectionManager } from '@/lib/import/connections/ConnectionManager';
import { ImportSourceType } from '@prisma/client';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { connectionConfig, tableName, format = 'csv' } = body;

    if (!connectionConfig || !tableName) {
      return NextResponse.json(
        { error: 'Connection config and table name are required' },
        { status: 400 }
      );
    }

    // Validate source type
    if (!Object.values(ImportSourceType).includes(connectionConfig.type)) {
      return NextResponse.json(
        { error: 'Invalid source type' },
        { status: 400 }
      );
    }

    const connectionManager = new ConnectionManager();

    try {
      // Get all table data (without pagination for export)
      const result = await connectionManager.getTableData(
        connectionConfig,
        tableName,
        10000, // Large limit for export
        0
      );

      if (!result || !result.rows.length) {
        return NextResponse.json(
          { error: 'No data found to export' },
          { status: 404 }
        );
      }

      // Generate CSV content
      if (format === 'csv') {
        const csvHeader = result.columns.join(',');
        const csvRows = result.rows.map(row => 
          row.map(cell => {
            // Escape CSV values
            const value = String(cell || '');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        );
        
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        // Return CSV file
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${tableName}.csv"`
          }
        });
      }

      return NextResponse.json(
        { error: 'Unsupported export format' },
        { status: 400 }
      );
    } catch (connectionError) {
      console.error('Connection error:', connectionError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to data source',
          details: connectionError instanceof Error ? connectionError.message : 'Unknown connection error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in table export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}