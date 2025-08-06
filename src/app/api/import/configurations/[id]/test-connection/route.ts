import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';
import { testConnection } from '@/lib/import/ConnectionManager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to test import connections
    const canTest = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'execute'
    });

    if (!canTest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { connectionConfig } = body;

    if (!connectionConfig) {
      return NextResponse.json(
        { error: 'Connection configuration is required' },
        { status: 400 }
      );
    }

    // Test the connection
    const result = await testConnection(connectionConfig);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.details,
      schema: result.schema
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}