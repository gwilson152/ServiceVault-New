import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ImportExecutionEngine } from '@/lib/import/ImportExecutionEngine';
import { ImportStatus } from '@prisma/client';

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

    // Check permission to execute imports
    const canExecute = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'execute'
    });

    if (!canExecute) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the configuration
    const configuration = await prisma.importConfiguration.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    if (!configuration.isActive) {
      return NextResponse.json({ error: 'Configuration is inactive' }, { status: 400 });
    }

    // Check if there are any running executions for this configuration
    const runningExecution = await prisma.importExecution.findFirst({
      where: {
        configurationId: resolvedParams.id,
        status: ImportStatus.RUNNING
      }
    });

    if (runningExecution) {
      return NextResponse.json(
        { error: 'Another execution is already running for this configuration', executionId: runningExecution.id },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { dryRun = false, preview = false, maxRecords } = body;

    // Create the execution record
    const execution = await prisma.importExecution.create({
      data: {
        configurationId: resolvedParams.id,
        status: ImportStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        executedBy: session.user.id
      }
    });

    // Parse configuration data
    const connectionConfig = typeof configuration.connectionConfig === 'string' 
      ? JSON.parse(configuration.connectionConfig)
      : configuration.connectionConfig;
    
    const fieldMappings = typeof configuration.fieldMappings === 'string'
      ? JSON.parse(configuration.fieldMappings)
      : configuration.fieldMappings;

    if (preview) {
      // For preview, we'll run a limited dry run
      try {
        const engine = new ImportExecutionEngine(execution.id, session.user.id);
        
        const result = await engine.executeImport(
          connectionConfig,
          fieldMappings,
          configuration.targetEntity,
          true // Always dry run for preview
        );

        // For preview, limit the returned data
        const previewData = {
          executionId: execution.id,
          status: result.status,
          totalRecords: Math.min(result.totalRecords, maxRecords || 10),
          processedRecords: Math.min(result.processedRecords, maxRecords || 10),
          successfulRecords: result.successfulRecords,
          failedRecords: result.failedRecords,
          duration: result.duration,
          errors: result.errors.slice(0, 5), // Limit errors in preview
          warnings: result.warnings.slice(0, 5), // Limit warnings in preview
          summary: result.summary
        };

        return NextResponse.json({
          success: true,
          preview: true,
          result: previewData
        });
      } catch (error) {
        // Clean up execution record on preview failure
        await prisma.importExecution.delete({
          where: { id: execution.id }
        });

        return NextResponse.json(
          { error: `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Start the import process asynchronously
    setImmediate(async () => {
      try {
        const engine = new ImportExecutionEngine(execution.id, session.user.id);
        await engine.executeImport(
          connectionConfig,
          fieldMappings,
          configuration.targetEntity,
          dryRun
        );
      } catch (error) {
        console.error('Import execution failed:', error);
        
        // Update execution status to failed
        await prisma.importExecution.update({
          where: { id: execution.id },
          data: {
            status: ImportStatus.FAILED,
            completedAt: new Date()
          }
        });

        // Log the error
        await prisma.importExecutionLog.create({
          data: {
            executionId: execution.id,
            level: 'ERROR',
            message: `Import execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: JSON.stringify(error),
            timestamp: new Date()
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      status: ImportStatus.PENDING,
      message: `Import ${dryRun ? 'dry run' : 'execution'} started`,
      dryRun
    }, { status: 202 });
  } catch (error) {
    console.error('Error starting import execution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check execution status
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

    // Check permission to view imports
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configurationId = resolvedParams.id;

    // Get recent executions for this configuration
    const executions = await prisma.importExecution.findMany({
      where: { configurationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        totalRecords: true,
        processedRecords: true,
        successfulRecords: true,
        failedRecords: true,
        startedAt: true,
        completedAt: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      executions
    });

  } catch (error) {
    console.error('Error fetching execution status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution status' },
      { status: 500 }
    );
  }
}