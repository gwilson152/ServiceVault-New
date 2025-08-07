import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ConnectionManager } from '@/lib/import/connections/ConnectionManager';
import { ImportSourceType } from '@prisma/client';

interface JoinCondition {
  id: string;
  sourceField: string;
  targetField: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
}

interface JoinedTableConfig {
  tableName: string;
  joinType: 'inner' | 'left' | 'right' | 'full';
  joinConditions: JoinCondition[];
  alias?: string;
}

interface JoinPreviewRequest {
  connectionConfig: any;
  primaryTable: string;
  joinedTables: JoinedTableConfig[];
  limit?: number;
  search?: string;
}

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

    const body: JoinPreviewRequest = await request.json();
    const { 
      connectionConfig, 
      primaryTable, 
      joinedTables = [], 
      limit = 20,
      search 
    } = body;

    if (!connectionConfig || !primaryTable) {
      return NextResponse.json(
        { error: 'Connection config and primary table are required' },
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

    if (joinedTables.length === 0) {
      return NextResponse.json(
        { error: 'At least one joined table is required' },
        { status: 400 }
      );
    }

    const connectionManager = new ConnectionManager();

    try {
      // Execute actual database join
      const result = await connectionManager.executeJoinQuery(
        connectionConfig,
        primaryTable,
        joinedTables,
        limit,
        search
      );

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to execute join query' },
          { status: 500 }
        );
      }

      return NextResponse.json(result);
    } catch (connectionError) {
      console.error('Join query error:', connectionError);
      return NextResponse.json(
        { 
          error: 'Failed to execute join query',
          details: connectionError instanceof Error ? connectionError.message : 'Unknown join query error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in join preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}