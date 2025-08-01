import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view roles
    const canViewRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canViewRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roles = await prisma.roleTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    return NextResponse.json(roles);

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create roles
    const canCreateRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canCreateRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions, isTemplate } = body;

    if (!name || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, permissions' },
        { status: 400 }
      );
    }

    // Check if role name already exists
    const existingRole = await prisma.roleTemplate.findUnique({
      where: { name }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    // Create the role
    const role = await prisma.roleTemplate.create({
      data: {
        name,
        description,
        permissions,
        isTemplate: isTemplate || false,
      }
    });

    return NextResponse.json(role);

  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete roles
    const canDeleteRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canDeleteRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Check if role exists
    const role = await prisma.roleTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent deletion if role is assigned to users
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      );
    }

    await prisma.roleTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Role deleted successfully' });

  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update roles
    const canUpdateRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canUpdateRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, permissions, isTemplate } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = await prisma.roleTemplate.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // If name is being changed, check for conflicts
    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.roleTemplate.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 400 }
        );
      }
    }

    // Update the role
    const updatedRole = await prisma.roleTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions && { permissions }),
        ...(isTemplate !== undefined && { isTemplate }),
      }
    });

    return NextResponse.json(updatedRole);

  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}