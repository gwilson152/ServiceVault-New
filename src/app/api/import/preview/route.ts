import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ConnectionManager } from '@/lib/import/ConnectionManager';
import { ConnectionConfig } from '@/lib/import/types';

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
    const { connectionConfig, tableName, limit = 10 } = body as {
      connectionConfig: ConnectionConfig;
      tableName?: string;
      limit?: number;
    };

    if (!connectionConfig) {
      return NextResponse.json(
        { error: 'Connection configuration is required' },
        { status: 400 }
      );
    }

    // Get table preview
    const preview = await ConnectionManager.getTablePreview(
      connectionConfig,
      tableName || '',
      limit
    );

    return NextResponse.json({
      success: true,
      preview,
      recordCount: preview.length,
      tableName: tableName || 'default'
    });

  } catch (error) {
    console.error('Error getting table preview:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get table preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}