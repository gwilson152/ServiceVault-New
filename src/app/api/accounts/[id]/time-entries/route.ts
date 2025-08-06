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

    // Check permission to view time entries
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "time-entries",
      action: "view"
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const billableOnly = searchParams.get('billableOnly') === 'true';
    const skip = (page - 1) * limit;

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      OR: [
        { accountId: id }, // Direct account time entries
        { ticket: { accountId: id } } // Time entries via tickets
      ]
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (userId) {
      where.userId = userId;
    }

    if (billableOnly) {
      where.noCharge = false;
    }

    // Get time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { id: true, title: true, status: true }
        },
        account: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    // Get total count
    const total = await prisma.timeEntry.count({ where });

    // Calculate totals
    const totals = await prisma.timeEntry.aggregate({
      where,
      _sum: {
        minutes: true,
      },
    });

    const billableTotals = await prisma.timeEntry.aggregate({
      where: {
        ...where,
        noCharge: false,
      },
      _sum: {
        minutes: true,
      },
    });

    return NextResponse.json({
      timeEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totals: {
        totalMinutes: totals._sum.minutes || 0,
        billableMinutes: billableTotals._sum.minutes || 0,
        nonBillableMinutes: (totals._sum.minutes || 0) - (billableTotals._sum.minutes || 0),
      }
    });

  } catch (error) {
    console.error('Error fetching account time entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to view time entries
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "time-entries",
      action: "view"
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      description, 
      minutes, 
      date, 
      noCharge, 
      ticketId, 
      userId 
    } = body;

    if (!description || !minutes || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: description, minutes, userId' },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If ticketId is provided, verify it belongs to this account
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, accountId: true }
      });

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      if (ticket.accountId !== id) {
        return NextResponse.json(
          { error: 'Ticket does not belong to this account' },
          { status: 400 }
        );
      }
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        description,
        minutes: parseInt(minutes),
        date: date ? new Date(date) : new Date(),
        noCharge: noCharge || false,
        ticketId: ticketId || null,
        accountId: ticketId ? null : id, // Only set accountId if no ticket
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { id: true, title: true }
        },
        account: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(timeEntry, { status: 201 });

  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}