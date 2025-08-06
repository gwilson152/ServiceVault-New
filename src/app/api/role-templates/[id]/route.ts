import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

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

    // Check permission to view role templates
    const canViewRoles = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'role-templates',
      action: 'view'
    });
    
    if (!canViewRoles) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const roleTemplate = await prisma.roleTemplate.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            membershipRoles: true,
            systemRoles: true
          }
        }
      }
    });

    if (!roleTemplate) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 });
    }

    return NextResponse.json({ roleTemplate });
  } catch (error) {
    console.error('Error fetching role template:', error);
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

    // Check permission to update role templates
    const canUpdateRoles = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'role-templates',
      action: 'update'
    });
    
    if (!canUpdateRoles) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      permissions, 
      inheritAllPermissions, 
      isSystemRole, 
      scope 
    } = body;

    // Check if role template exists
    const existingRole = await prisma.roleTemplate.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 });
    }

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Role name cannot exceed 100 characters' }, { status: 400 });
    }

    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description cannot exceed 500 characters' }, { status: 400 });
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 });
    }

    // Validate permission format
    const validPermissionPattern = /^[a-z-]+:[a-z-]+$/;
    for (const permission of permissions) {
      if (!validPermissionPattern.test(permission)) {
        return NextResponse.json({ 
          error: `Invalid permission format: ${permission}. Expected format: "resource:action"` 
        }, { status: 400 });
      }
    }

    // Check for duplicate name (excluding current role)
    if (name.trim() !== existingRole.name) {
      const duplicateRole = await prisma.roleTemplate.findUnique({
        where: { name: name.trim() }
      });

      if (duplicateRole) {
        return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
      }
    }

    // Update the role template
    const updatedRole = await prisma.roleTemplate.update({
      where: { id: resolvedParams.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        permissions: permissions,
        inheritAllPermissions: Boolean(inheritAllPermissions),
        isSystemRole: Boolean(isSystemRole),
        scope: scope || 'account'
      }
    });

    return NextResponse.json({ 
      roleTemplate: updatedRole,
      message: 'Role template updated successfully' 
    });
  } catch (error) {
    console.error('Error updating role template:', error);
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

    // Check permission to delete role templates
    const canDeleteRoles = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'role-templates',
      action: 'delete'
    });
    
    if (!canDeleteRoles) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Check if role template exists and get usage counts
    const roleTemplate = await prisma.roleTemplate.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            membershipRoles: true,
            systemRoles: true
          }
        }
      }
    });

    if (!roleTemplate) {
      return NextResponse.json({ error: 'Role template not found' }, { status: 404 });
    }

    // Check if role is in use
    const totalUsage = roleTemplate._count.membershipRoles + roleTemplate._count.systemRoles;
    if (totalUsage > 0) {
      return NextResponse.json({ 
        error: `Cannot delete role template. It is currently assigned to ${totalUsage} user(s).` 
      }, { status: 400 });
    }

    // Delete the role template
    await prisma.roleTemplate.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ 
      message: 'Role template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting role template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}