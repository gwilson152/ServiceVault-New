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
    const { connectionConfig, tableName, page = 1, limit = 50 } = body;

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
    const offset = (page - 1) * limit;

    try {
      // Get table data with pagination
      const result = await connectionManager.getTableData(
        connectionConfig,
        tableName,
        limit,
        offset
      );

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to retrieve table data' },
          { status: 500 }
        );
      }

      // Format the response
      const response = {
        columns: result.columns || [],
        rows: result.rows || [],
        totalCount: result.totalCount || 0,
        page,
        limit,
        hasNextPage: result.totalCount ? (offset + limit) < result.totalCount : false,
        hasPrevPage: page > 1
      };

      return NextResponse.json(response);
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
    console.error('Error in table preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}