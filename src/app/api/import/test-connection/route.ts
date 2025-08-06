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

    // Check permission to test import connections
    const canTest = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'create'
    });

    if (!canTest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const connectionConfig: ConnectionConfig = await request.json();

    // Validate required fields based on connection type
    const validationResult = validateConnectionConfig(connectionConfig);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid connection configuration', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Test the connection
    const testResult = await ConnectionManager.testConnection(connectionConfig);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message,
        connectionTime: testResult.connectionTime,
        schema: testResult.schema,
        recordCount: testResult.recordCount
      });
    } else {
      return NextResponse.json({
        success: false,
        message: testResult.message,
        details: testResult.details
      });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateConnectionConfig(config: ConnectionConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Connection type is required');
  }

  switch (config.type) {
    case 'DATABASE_MYSQL':
    case 'DATABASE_POSTGRESQL':
      if (!config.host) errors.push('Database host is required');
      if (!config.database) errors.push('Database name is required');
      if (!config.username) errors.push('Database username is required');
      break;

    case 'DATABASE_SQLITE':
      if (!config.filePath) errors.push('SQLite file path is required');
      break;

    case 'FILE_CSV':
    case 'FILE_EXCEL':
    case 'FILE_JSON':
      if (!config.filePath) errors.push('File path is required');
      break;

    case 'API_REST':
      if (!config.apiUrl) errors.push('API URL is required');
      if (config.apiUrl && !isValidUrl(config.apiUrl)) {
        errors.push('Invalid API URL format');
      }
      break;

    default:
      errors.push(`Unsupported connection type: ${config.type}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}