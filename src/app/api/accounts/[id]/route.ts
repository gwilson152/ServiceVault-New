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

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view accounts
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "view"
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, email: true, name: true, createdAt: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        tickets: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true }
            },
            creator: {
              select: { id: true, name: true, email: true }
            },
            _count: {
              select: { timeEntries: true, addons: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        timeEntries: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            ticket: {
              select: { id: true, title: true }
            }
          },
          orderBy: { date: 'desc' }
        },
        invoices: {
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            },
            _count: {
              select: { items: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        settings: true,
        billingRates: {
          include: {
            billingRate: {
              select: { id: true, name: true, rate: true }
            }
          }
        },
        parent: {
          select: { id: true, name: true, accountType: true }
        },
        children: {
          include: {
            memberships: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, createdAt: true }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Calculate detailed statistics
    const stats = {
      users: {
        total: account.memberships.length,
        active: account.memberships.filter(m => m.user !== null).length,
        pending: account.memberships.filter(m => m.user === null).length,
      },
      tickets: {
        total: account.tickets.length,
        open: account.tickets.filter(t => t.status === 'OPEN').length,
        inProgress: account.tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: account.tickets.filter(t => t.status === 'RESOLVED').length,
      },
      timeEntries: {
        total: account.timeEntries.length,
        totalMinutes: account.timeEntries.reduce((sum, te) => sum + te.minutes, 0),
        billableMinutes: account.timeEntries.filter(te => !te.noCharge).reduce((sum, te) => sum + te.minutes, 0),
        nonBillableMinutes: account.timeEntries.filter(te => te.noCharge).reduce((sum, te) => sum + te.minutes, 0),
      },
      invoices: {
        total: account.invoices.length,
        draft: account.invoices.filter(i => i.status === 'DRAFT').length,
        sent: account.invoices.filter(i => i.status === 'SENT').length,
        paid: account.invoices.filter(i => i.status === 'PAID').length,
        totalAmount: account.invoices.reduce((sum, i) => sum + i.total, 0),
      }
    };

    // Add status information and statistics to account users
    const processAccountUser = (membership: any, sourceAccountName?: string) => {
      const userStats = {
        tickets: {
          created: account.tickets.filter(t => t.creator?.id === membership.user?.id).length,
          assigned: account.tickets.filter(t => t.assignee?.id === membership.user?.id).length,
        },
        timeEntries: {
          total: account.timeEntries.filter(te => te.userId === membership.user?.id).length,
          totalMinutes: account.timeEntries
            .filter(te => te.userId === membership.user?.id)
            .reduce((sum, te) => sum + te.minutes, 0),
          billableMinutes: account.timeEntries
            .filter(te => te.userId === membership.user?.id && !te.noCharge)
            .reduce((sum, te) => sum + te.minutes, 0),
        }
      };

      return {
        ...membership,
        // Convert membership to accountUser format for backward compatibility
        id: membership.id,
        userId: membership.user?.id,
        email: membership.user?.email,
        name: membership.user?.name,
        hasLogin: !!membership.user,
        canBeAssigned: true, // Memberships are active by default
        invitationStatus: membership.user ? 'activated' : 'pending',
        sourceAccount: sourceAccountName || account.name,
        stats: userStats
      };
    };

    // Process direct account users
    const directAccountUsers = account.memberships.map(membership => 
      processAccountUser(membership)
    );

    // Process child account users
    const childAccountUsers = account.children.flatMap(childAccount => 
      childAccount.memberships.map(membership => 
        processAccountUser(membership, childAccount.name)
      )
    );

    // Combine all users
    const allAccountUsers = [...directAccountUsers, ...childAccountUsers];

    const accountWithStatus = {
      ...account,
      accountUsers: directAccountUsers, // Keep original for backward compatibility
      allAccountUsers: allAccountUsers, // New field with all users including child accounts
      childAccounts: account.children.map(child => ({
        id: child.id,
        name: child.name,
        accountType: child.accountType
      })), // Remove the memberships from children to avoid duplication
      stats
    };

    return NextResponse.json(accountWithStatus);

  } catch (error) {
    console.error('Error fetching account:', error);
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

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to update accounts
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "update"
    });
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id },
      select: { id: true, accountType: true }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Build update data dynamically based on provided fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.domains !== undefined) updateData.domains = body.domains;
    if (body.customFields !== undefined) updateData.customFields = body.customFields;

    // Update account with only provided fields
    const account = await prisma.account.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, accountType: true }
        },
        children: {
          select: { id: true, name: true, accountType: true }
        }
      }
    });

    return NextResponse.json(account);

  } catch (error) {
    console.error('Error updating account:', error);
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

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to update accounts
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "update"
    });
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      companyName, 
      address, 
      phone, 
      customFields 
    } = body;

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id },
      select: { id: true, accountType: true }
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Update account
    const account = await prisma.account.update({
      where: { id },
      data: {
        name,
        companyName,
        address,
        phone,
        customFields,
      },
      include: {
        parent: {
          select: { id: true, name: true, accountType: true }
        },
        children: {
          select: { id: true, name: true, accountType: true }
        }
      }
    });

    return NextResponse.json(account);

  } catch (error) {
    console.error('Error updating account:', error);
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

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to update accounts
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "update"
    });
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if account exists and get related data counts
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true,
            timeEntries: true,
            invoices: true,
            memberships: true,
            children: true,
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Prevent deletion if account has child accounts
    if (account._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with subsidiary accounts' },
        { status: 400 }
      );
    }

    // Prevent deletion if account has significant data
    if (account._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with existing invoices' },
        { status: 400 }
      );
    }

    // Delete related data in transaction
    await prisma.$transaction([
      // Delete account memberships (this will also handle invitation cleanup)
      prisma.accountMembership.deleteMany({
        where: { accountId: id }
      }),
      // Delete time entries
      prisma.timeEntry.deleteMany({
        where: { accountId: id }
      }),
      // Delete tickets (and their related data will cascade)
      prisma.ticket.deleteMany({
        where: { accountId: id }
      }),
      // Delete account settings
      prisma.accountSettings.deleteMany({
        where: { accountId: id }
      }),
      // Delete billing rates
      prisma.accountBillingRate.deleteMany({
        where: { accountId: id }
      }),
      // Finally delete the account
      prisma.account.delete({
        where: { id }
      })
    ]);

    return NextResponse.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}