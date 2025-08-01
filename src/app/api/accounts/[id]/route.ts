import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

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
    const canViewAccounts = await hasPermission(session.user.id, { resource: 'accounts', action: 'view' });
    if (!canViewAccounts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        accountUsers: {
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
            accountUserCreator: {
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
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        parentAccount: {
          select: { id: true, name: true, accountType: true }
        },
        childAccounts: {
          select: { id: true, name: true, accountType: true }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Calculate detailed statistics
    const stats = {
      users: {
        total: account.accountUsers.length,
        active: account.accountUsers.filter(au => au.user !== null).length,
        pending: account.accountUsers.filter(au => au.user === null).length,
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

    return NextResponse.json({
      ...account,
      stats
    });

  } catch (error) {
    console.error('Error fetching account:', error);
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
    const canUpdateAccounts = await hasPermission(session.user.id, { resource: 'accounts', action: 'update' });
    if (!canUpdateAccounts) {
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
        parentAccount: {
          select: { id: true, name: true, accountType: true }
        },
        childAccounts: {
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
    const canUpdateAccounts = await hasPermission(session.user.id, { resource: 'accounts', action: 'update' });
    if (!canUpdateAccounts) {
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
            accountUsers: true,
            childAccounts: true,
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Prevent deletion if account has child accounts
    if (account._count.childAccounts > 0) {
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
      // Delete account users (this will also handle invitation cleanup)
      prisma.accountUser.deleteMany({
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