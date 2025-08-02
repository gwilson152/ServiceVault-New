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

    // Check permission to view accounts
    const canViewAccounts = await hasPermission(session.user.id, { resource: 'accounts', action: 'view' });
    if (!canViewAccounts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const accountType = searchParams.get('accountType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (accountType && accountType !== 'ALL') {
      where.accountType = accountType;
    }

    // Get accounts with related data
    const accounts = await prisma.account.findMany({
      where,
      include: {
        accountUsers: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
          }
        },
        tickets: {
          select: { id: true, status: true }
        },
        timeEntries: {
          select: { id: true, minutes: true, noCharge: true }
        },
        childAccounts: {
          select: { id: true, name: true, accountType: true }
        },
        parentAccount: {
          select: { id: true, name: true, accountType: true }
        },
        _count: {
          select: {
            tickets: true,
            timeEntries: true,
            invoices: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.account.count({ where });

    // Calculate statistics for each account
    const accountsWithStats = accounts.map(account => {
      const activeUsers = account.accountUsers.filter(au => au.user !== null).length;
      const pendingInvitations = account.accountUsers.filter(au => au.user === null).length;
      const totalMinutes = account.timeEntries.reduce((sum, te) => sum + te.minutes, 0);
      const billableMinutes = account.timeEntries.filter(te => !te.noCharge).reduce((sum, te) => sum + te.minutes, 0);

      return {
        ...account,
        stats: {
          activeUsers,
          pendingInvitations,
          totalUsers: account.accountUsers.length,
          totalTickets: account._count.tickets,
          totalTimeEntries: account._count.timeEntries,
          totalInvoices: account._count.invoices,
          totalMinutes,
          billableMinutes,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10, // Convert to hours with 1 decimal place
          billableHours: Math.round((billableMinutes / 60) * 10) / 10
        }
      };
    });

    return NextResponse.json({
      accounts: accountsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
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

    // Check permission to create accounts
    const canCreateAccounts = await hasPermission(session.user.id, { resource: 'accounts', action: 'create' });
    if (!canCreateAccounts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      accountType, 
      companyName, 
      address, 
      phone, 
      parentAccountId,
      customFields 
    } = body;

    if (!name || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, accountType' },
        { status: 400 }
      );
    }

    // Validate account type
    if (!['INDIVIDUAL', 'ORGANIZATION', 'SUBSIDIARY'].includes(accountType)) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      );
    }

    // Validate parent account for subsidiaries
    if (accountType === 'SUBSIDIARY') {
      if (!parentAccountId) {
        return NextResponse.json(
          { error: 'Parent account is required for subsidiary accounts' },
          { status: 400 }
        );
      }

      const parentAccount = await prisma.account.findUnique({
        where: { id: parentAccountId }
      });

      if (!parentAccount) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 404 }
        );
      }
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        name,
        accountType,
        companyName,
        address,
        phone,
        parentAccountId: accountType === 'SUBSIDIARY' ? parentAccountId : null,
        customFields: customFields || {},
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

    // Create default account settings
    await prisma.accountSettings.create({
      data: {
        accountId: account.id,
        canViewTimeEntries: true,
        canCreateTickets: true,
        canAddTicketAddons: false,
      }
    });

    return NextResponse.json(account, { status: 201 });

  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}