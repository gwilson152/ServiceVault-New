import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';
import { ImportSourceType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    const { searchParams } = new URL(request.url);
    const targetEntity = searchParams.get('targetEntity');
    const sourceType = searchParams.get('sourceType');
    const active = searchParams.get('active');

    let where: any = {};

    if (targetEntity) {
      where.targetEntity = targetEntity;
    }

    if (sourceType && Object.values(ImportSourceType).includes(sourceType as ImportSourceType)) {
      where.sourceType = sourceType;
    }

    if (active !== null) {
      where.isActive = active === 'true';
    }

    const configurations = await prisma.importConfiguration.findMany({
      where,
      include: {
        _count: {
          select: {
            executions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Augment with creator information (since no FK constraint)
    const configsWithCreator = await Promise.all(
      configurations.map(async (config) => {
        const creator = await prisma.user.findUnique({
          where: { id: config.createdBy },
          select: { id: true, name: true, email: true }
        });
        
        return {
          ...config,
          creator: creator || { id: config.createdBy, name: 'Unknown User', email: null }
        };
      })
    );

    return NextResponse.json({
      configurations: configsWithCreator,
      total: configsWithCreator.length
    });
  } catch (error) {
    console.error('Error fetching import configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to create import configurations
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'imports',
      action: 'create'
    });

    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sourceType,
      connectionConfig,
      sourceTableConfig,
      isMultiStage,
      stages,
      isActive
    } = body;

    // Validate required fields
    if (!name || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sourceType' },
        { status: 400 }
      );
    }

    // Validate source type
    if (!Object.values(ImportSourceType).includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid source type' },
        { status: 400 }
      );
    }

    // Validate stages structure for multi-stage imports
    if (isMultiStage && stages && !Array.isArray(stages)) {
      return NextResponse.json(
        { error: 'stages must be an array for multi-stage imports' },
        { status: 400 }
      );
    }

    // Create the import configuration with stages in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const configuration = await tx.importConfiguration.create({
        data: {
          name,
          description,
          sourceType,
          connectionConfig: connectionConfig || {},
          sourceTableConfig: sourceTableConfig || {},
          isMultiStage: isMultiStage || false,
          isActive: isActive !== false,
          createdBy: session.user.id
        }
      });

      // Create stages if it's a multi-stage import
      if (isMultiStage && stages && stages.length > 0) {
        await tx.importStage.createMany({
          data: stages.map((stage: any) => ({
            configurationId: configuration.id,
            order: stage.order,
            name: stage.name,
            description: stage.description,
            sourceTable: stage.sourceTable,
            targetEntity: stage.targetEntity,
            fieldMappings: stage.fieldMappings || [],
            fieldOverrides: stage.fieldOverrides || {},
            dependsOnStages: stage.dependsOnStages || [],
            crossStageMapping: stage.crossStageMapping || {},
            validationRules: stage.validationRules || [],
            transformRules: stage.transformRules || [],
            isEnabled: stage.isEnabled !== false
          }))
        });
      }

      return configuration;
    });

    // Get creator information
    const creator = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true }
    });

    return NextResponse.json({
      configuration: {
        ...result,
        creator
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating import configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}