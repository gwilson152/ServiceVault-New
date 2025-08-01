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

    // Check if user has permission to view user roles
    const canViewRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canViewRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userRoles = await prisma.userRole.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(userRoles);

  } catch (error) {
    console.error('Error fetching user roles:', error);
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

    // Check if user has permission to assign roles
    const canAssignRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canAssignRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, roleId, userIds, bulk } = body;

    // Handle bulk assignment
    if (bulk && Array.isArray(userIds) && roleId) {
      const assignments = [];
      const errors = [];

      for (const uid of userIds) {
        try {
          // Check if assignment already exists
          const existingAssignment = await prisma.userRole.findUnique({
            where: {
              userId_roleId: {
                userId: uid,
                roleId: roleId
              }
            }
          });

          if (!existingAssignment) {
            const assignment = await prisma.userRole.create({
              data: {
                userId: uid,
                roleId: roleId
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            });
            assignments.push(assignment);
          }
        } catch (error) {
          console.error(`Error assigning role to user ${uid}:`, error);
          errors.push({ userId: uid, error: 'Assignment failed' });
        }
      }

      return NextResponse.json({
        success: true,
        assignments,
        errors,
        message: `Successfully assigned role to ${assignments.length} users${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
      });
    }

    // Handle single assignment
    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, roleId' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if role exists
    const role = await prisma.roleTemplate.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this role' },
        { status: 400 }
      );
    }

    // Create the assignment
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true
          }
        }
      }
    });

    return NextResponse.json(userRole);

  } catch (error) {
    console.error('Error assigning role:', error);
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

    // Check if user has permission to remove role assignments
    const canRemoveRoles = await hasPermission(session.user.id, {
      resource: 'system',
      action: 'admin'
    });

    if (!canRemoveRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, userId, roleId } = body;

    // Handle removal by assignment ID
    if (id) {
      const assignment = await prisma.userRole.findUnique({
        where: { id }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      await prisma.userRole.delete({
        where: { id }
      });

      return NextResponse.json({ message: 'Role assignment removed successfully' });
    }

    // Handle removal by userId and roleId
    if (userId && roleId) {
      const assignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      });

      return NextResponse.json({ message: 'Role assignment removed successfully' });
    }

    return NextResponse.json(
      { error: 'Missing required fields: id or (userId and roleId)' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error removing role assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}