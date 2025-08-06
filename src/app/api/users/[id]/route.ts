import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to view users
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "view"
    });
    
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        memberships: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    inheritAllPermissions: true,
                    permissions: true
                  }
                }
              }
            }
          }
        },
        systemRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                inheritAllPermissions: true,
                permissions: true
              }
            }
          }
        },
        timeEntries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            ticket: {
              select: {
                id: true,
                title: true,
                status: true
              }
            },
            account: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        createdTickets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            account: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        assignedTickets: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            updatedAt: true,
            account: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            timeEntries: true,
            createdTickets: true,
            assignedTickets: true,
            memberships: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to edit users
    const canEdit = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "edit"
    });
    
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for email conflicts if email is being changed
    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email }
      });

      if (emailConflict) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email })
      },
      include: {
        memberships: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                accountType: true
              }
            },
            roles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    inheritAllPermissions: true
                  }
                }
              }
            }
          }
        },
        systemRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                inheritAllPermissions: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to delete users
    const canDelete = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "delete"
    });
    
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user exists and get related data
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            timeEntries: true,
            createdTickets: true,
            assignedTickets: true,
            memberships: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-deletion
    if (user.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own user account" },
        { status: 400 }
      );
    }

    // Check for dependencies
    const hasTimeEntries = user._count.timeEntries > 0;
    const hasCreatedTickets = user._count.createdTickets > 0;
    const hasAssignedTickets = user._count.assignedTickets > 0;

    if (hasTimeEntries || hasCreatedTickets || hasAssignedTickets) {
      return NextResponse.json(
        { 
          error: "Cannot delete user with associated time entries or tickets. Please reassign or clean up data first.",
          details: {
            timeEntries: user._count.timeEntries,
            createdTickets: user._count.createdTickets,
            assignedTickets: user._count.assignedTickets
          }
        },
        { status: 400 }
      );
    }

    // Delete user and all associated data
    await prisma.$transaction(async (tx) => {
      // Delete account memberships and their roles
      await tx.membershipRole.deleteMany({
        where: {
          membership: {
            userId: resolvedParams.id
          }
        }
      });

      await tx.accountMembership.deleteMany({
        where: { userId: resolvedParams.id }
      });

      // Delete system roles
      await tx.systemRole.deleteMany({
        where: { userId: resolvedParams.id }
      });

      // Delete user
      await tx.user.delete({
        where: { id: resolvedParams.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}