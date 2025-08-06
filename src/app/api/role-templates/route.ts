import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view role templates (super-admin only)
    const canViewRoles = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'role-templates',
      action: 'view'
    });
    
    if (!canViewRoles) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeUsage = searchParams.get('includeUsage') === 'true';

    let roleTemplates;
    
    if (includeUsage) {
      // Include usage counts for management interface
      roleTemplates = await prisma.roleTemplate.findMany({
        orderBy: [
          { inheritAllPermissions: 'desc' }, // Super admin roles first
          { isSystemRole: 'desc' },          // System roles next
          { name: 'asc' }                   // Then alphabetical
        ],
        include: {
          _count: {
            select: {
              membershipRoles: true,
              systemRoles: true
            }
          }
        }
      });
    } else {
      // Simple list for dropdowns/selectors
      roleTemplates = await prisma.roleTemplate.findMany({
        orderBy: [
          { inheritAllPermissions: 'desc' },
          { isSystemRole: 'desc' },
          { name: 'asc' }
        ],
        select: {
          id: true,
          name: true,
          description: true,
          inheritAllPermissions: true,
          isSystemRole: true,
          scope: true
        }
      });
    }

    return NextResponse.json({ roleTemplates });
  } catch (error) {
    console.error('Error fetching role templates:', error);
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

    // Check permission to create role templates (super-admin only)
    const canCreateRoles = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'role-templates',
      action: 'create'
    });
    
    if (!canCreateRoles) {
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

    // Check for duplicate name
    const existingRole = await prisma.roleTemplate.findUnique({
      where: { name: name.trim() }
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    // Create the role template
    const roleTemplate = await prisma.roleTemplate.create({
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
      roleTemplate,
      message: 'Role template created successfully' 
    });
  } catch (error) {
    console.error('Error creating role template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}