import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ImportSourceType } from '@prisma/client';

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

    // Check permission to view import configurations
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const configuration = await prisma.importConfiguration.findUnique({
      where: { id: resolvedParams.id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            name: true,
            description: true,
            sourceTable: true,
            targetEntity: true,
            isEnabled: true
          }
        },
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            totalRecords: true,
            successfulRecords: true,
            failedRecords: true,
            startedAt: true,
            completedAt: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    });

    if (!configuration) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Get creator information
    const creator = await prisma.user.findUnique({
      where: { id: configuration.createdBy },
      select: { id: true, name: true, email: true }
    });

    return NextResponse.json({
      ...configuration,
      creator: creator || { id: configuration.createdBy, name: 'Unknown User', email: null }
    });
  } catch (error) {
    console.error('Error fetching import configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to edit import configurations
    const canEdit = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'edit'
    });

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sourceType,
      connectionConfig,
      targetEntity,
      fieldMappings,
      relationshipMappings,
      validationRules,
      transformRules,
      isActive
    } = body;

    // Validate source type if provided
    if (sourceType && !Object.values(ImportSourceType).includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid source type' },
        { status: 400 }
      );
    }

    // Validate field mappings structure if provided
    if (fieldMappings && !Array.isArray(fieldMappings)) {
      return NextResponse.json(
        { error: 'fieldMappings must be an array' },
        { status: 400 }
      );
    }

    // Check if configuration exists
    const existingConfig = await prisma.importConfiguration.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Update the configuration
    const configuration = await prisma.importConfiguration.update({
      where: { id: resolvedParams.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sourceType && { sourceType }),
        ...(connectionConfig && { connectionConfig }),
        ...(targetEntity && { targetEntity }),
        ...(fieldMappings && { fieldMappings }),
        ...(relationshipMappings && { relationshipMappings }),
        ...(validationRules && { validationRules }),
        ...(transformRules && { transformRules }),
        ...(isActive !== undefined && { isActive })
      }
    });

    // Get creator information
    const creator = await prisma.user.findUnique({
      where: { id: configuration.createdBy },
      select: { id: true, name: true, email: true }
    });

    return NextResponse.json({
      ...configuration,
      creator
    });
  } catch (error) {
    console.error('Error updating import configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to delete import configurations
    const canDelete = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'delete'
    });

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if configuration exists
    const existingConfig = await prisma.importConfiguration.findUnique({
      where: { id: resolvedParams.id },
      include: {
        executions: {
          where: {
            status: { in: ['RUNNING', 'PENDING'] }
          }
        }
      }
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Check if there are running executions
    if (existingConfig.executions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete configuration with running executions' },
        { status: 409 }
      );
    }

    // Delete the configuration (this will cascade to executions and logs)
    await prisma.importConfiguration.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting import configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to edit import configurations
    const canEdit = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'edit'
    });

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Check if configuration exists
    const existingConfig = await prisma.importConfiguration.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Update the configuration with partial data
    const configuration = await prisma.importConfiguration.update({
      where: { id: resolvedParams.id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Configuration updated successfully',
      configuration
    });
  } catch (error) {
    console.error('Error patching import configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}