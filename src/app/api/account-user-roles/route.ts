import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    // Check if user has permission to view account user roles
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'users',
      action: 'view',
      accountId: accountId || undefined
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause based on account context
    const whereClause: any = {};
    if (accountId) {
      whereClause.accountUser = {
        accountId: accountId
      };
    }

    const accountUserRoles = await prisma.accountUserRole.findMany({
      where: whereClause,
      include: {
        accountUser: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true
              }
            }
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            applicableTo: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(accountUserRoles);

  } catch (error) {
    console.error('Error fetching account user roles:', error);
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

    const body = await request.json();
    const { accountUserId, roleId, scope, accountUserIds, bulk } = body;

    // Handle bulk assignment
    if (bulk && Array.isArray(accountUserIds) && roleId) {
      const assignments = [];
      const errors = [];

      for (const auId of accountUserIds) {
        try {
          // Get account user to check permissions
          const accountUser = await prisma.accountUser.findUnique({
            where: { id: auId },
            include: { account: true }
          });

          if (!accountUser) {
            errors.push({ accountUserId: auId, error: 'Account user not found' });
            continue;
          }

          // Check if user has permission to assign roles to this account
          const canAssignRole = await permissionService.hasPermission({
            userId: session.user.id,
            resource: 'users',
            action: 'manage',
            accountId: accountUser.account.id
          });

          if (!canAssignRole) {
            errors.push({ accountUserId: auId, error: 'Permission denied for this account' });
            continue;
          }

          // Check if assignment already exists
          const existingAssignment = await prisma.accountUserRole.findUnique({
            where: {
              accountUserId_roleId: {
                accountUserId: auId,
                roleId: roleId
              }
            }
          });

          if (!existingAssignment) {
            const assignment = await prisma.accountUserRole.create({
              data: {
                accountUserId: auId,
                roleId: roleId,
                scope: scope || 'account'
              },
              include: {
                accountUser: {
                  include: {
                    account: {
                      select: {
                        id: true,
                        name: true,
                        accountType: true
                      }
                    }
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
          console.error(`Error assigning role to account user ${auId}:`, error);
          errors.push({ accountUserId: auId, error: 'Assignment failed' });
        }
      }

      return NextResponse.json({
        success: true,
        assignments,
        errors,
        message: `Successfully assigned role to ${assignments.length} account users${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
      });
    }

    // Handle single assignment
    if (!accountUserId || !roleId) {
      return NextResponse.json(
        { error: 'Missing required fields: accountUserId, roleId' },
        { status: 400 }
      );
    }

    // Check if account user exists and get account context
    const accountUser = await prisma.accountUser.findUnique({
      where: { id: accountUserId },
      include: { account: true }
    });

    if (!accountUser) {
      return NextResponse.json({ error: 'Account user not found' }, { status: 404 });
    }

    // Check if user has permission to assign roles to this account
    const canAssignRole = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'users',
      action: 'manage',
      accountId: accountUser.account.id
    });

    if (!canAssignRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if role exists and is applicable to account users
    const role = await prisma.roleTemplate.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.applicableTo !== 'account' && role.applicableTo !== 'both') {
      return NextResponse.json(
        { error: 'Role is not applicable to account users' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.accountUserRole.findUnique({
      where: {
        accountUserId_roleId: {
          accountUserId,
          roleId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Account user is already assigned to this role' },
        { status: 400 }
      );
    }

    // Create the assignment
    const accountUserRole = await prisma.accountUserRole.create({
      data: {
        accountUserId,
        roleId,
        scope: scope || role.defaultScope || 'account'
      },
      include: {
        accountUser: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true
              }
            }
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

    return NextResponse.json(accountUserRole);

  } catch (error) {
    console.error('Error assigning account user role:', error);
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

    const body = await request.json();
    const { id, accountUserId, roleId } = body;

    // Handle removal by assignment ID
    if (id) {
      const assignment = await prisma.accountUserRole.findUnique({
        where: { id },
        include: {
          accountUser: {
            include: { account: true }
          }
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Check permission for the account
      const canRemoveRole = await permissionService.hasPermission({
        userId: session.user.id,
        resource: 'users',
        action: 'manage',
        accountId: assignment.accountUser.account.id
      });

      if (!canRemoveRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.accountUserRole.delete({
        where: { id }
      });

      return NextResponse.json({ message: 'Role assignment removed successfully' });
    }

    // Handle removal by accountUserId and roleId
    if (accountUserId && roleId) {
      const assignment = await prisma.accountUserRole.findUnique({
        where: {
          accountUserId_roleId: {
            accountUserId,
            roleId
          }
        },
        include: {
          accountUser: {
            include: { account: true }
          }
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      // Check permission for the account
      const canRemoveRole = await permissionService.hasPermission({
        userId: session.user.id,
        resource: 'users',
        action: 'manage',
        accountId: assignment.accountUser.account.id
      });

      if (!canRemoveRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.accountUserRole.delete({
        where: {
          accountUserId_roleId: {
            accountUserId,
            roleId
          }
        }
      });

      return NextResponse.json({ message: 'Role assignment removed successfully' });
    }

    return NextResponse.json(
      { error: 'Missing required fields: id or (accountUserId and roleId)' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error removing account user role assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}