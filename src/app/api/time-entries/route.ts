import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const ticketId = searchParams.get('ticketId');
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const billable = searchParams.get('billable');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user.role === 'CUSTOMER' || session.user.role === 'ACCOUNT_USER') {
      // Customers can only see their own time entries or those related to their accounts
      const userAccounts = await prisma.accountUser.findMany({
        where: { userId: session.user.id },
        select: { accountId: true }
      });
      const accountIds = userAccounts.map(ua => ua.accountId);
      
      where.OR = [
        { userId: session.user.id },
        { accountId: { in: accountIds } },
        { ticket: { accountId: { in: accountIds } } }
      ];
    } else if (session.user.role === 'EMPLOYEE') {
      // Employees can see their own time entries
      where.userId = session.user.id;
    }
    // Admins can see all time entries (no additional filtering)

    // Apply filters
    if (ticketId) {
      where.ticketId = ticketId;
    }
    if (accountId) {
      where.accountId = accountId;
    }
    if (userId && (session.user.role === 'ADMIN' || session.user.id === userId)) {
      where.userId = userId;
    }
    if (startDate) {
      where.date = { ...where.date as Record<string, unknown>, gte: new Date(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date as Record<string, unknown>, lte: new Date(endDate) };
    }
    if (billable !== null && billable !== undefined) {
      where.noCharge = billable === 'true' ? false : true;
    }

    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          ticket: {
            select: { 
              id: true, 
              title: true,
              account: {
                select: { id: true, name: true }
              }
            }
          },
          account: {
            select: { id: true, name: true }
          },
          billingRate: {
            select: { id: true, name: true, rate: true }
          },
          approver: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.timeEntry.count({ where })
    ]);

    return NextResponse.json({
      timeEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employees and admins can create time entries
    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, accountId, minutes, hours, description, date, time, noCharge, billingRateId, timerId } = body;

    // Handle backward compatibility: if hours is provided, convert to minutes
    let timeInMinutes: number;
    if (minutes !== undefined) {
      timeInMinutes = parseInt(minutes.toString());
    } else if (hours !== undefined) {
      // Convert hours to minutes for backward compatibility
      timeInMinutes = Math.round(parseFloat(hours.toString()) * 60);
    } else {
      return NextResponse.json({ error: "Either minutes or hours must be provided" }, { status: 400 });
    }

    // Validation
    if (!timeInMinutes || timeInMinutes <= 0) {
      return NextResponse.json({ error: "Time must be greater than 0 minutes" }, { status: 400 });
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Must have either ticketId or accountId, but not both
    if ((!ticketId && !accountId) || (ticketId && accountId)) {
      return NextResponse.json({ 
        error: "Time entry must be associated with either a ticket or an account, but not both" 
      }, { status: 400 });
    }

    // Verify ticket exists and user has access (if ticketId provided)
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { account: true }
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      // Check access permissions
      if (session.user.role === 'EMPLOYEE') {
        // Employees can only log time on tickets assigned to them or in general
        const hasAccess = ticket.assigneeId === session.user.id || !ticket.assigneeId;
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied to this ticket" }, { status: 403 });
        }
      }
    }

    // Verify account exists and user has access (if accountId provided)
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Check access permissions for account-direct time entries
      if (session.user.role === 'EMPLOYEE') {
        // Employees can log time to any account (business decision)
        // Or we could restrict this to accounts they're associated with
      }
    }

    // Get billing rate details if provided
    let billingRateName = null;
    let billingRateValue = null;
    
    if (billingRateId) {
      const billingRate = await prisma.billingRate.findUnique({
        where: { id: billingRateId }
      });
      
      if (billingRate) {
        billingRateName = billingRate.name;
        billingRateValue = billingRate.rate;
      }
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        ticketId: ticketId || null,
        accountId: accountId || null,
        userId: session.user.id,
        minutes: timeInMinutes,
        description: description.trim(),
        date: date && time ? new Date(`${date}T${time}:00`) : date ? new Date(date) : new Date(),
        noCharge: Boolean(noCharge),
        billingRateId: billingRateId || null,
        billingRateName,
        billingRateValue
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { 
            id: true, 
            title: true,
            account: {
              select: { id: true, name: true }
            }
          }
        },
        account: {
          select: { id: true, name: true }
        },
        billingRate: {
          select: { id: true, name: true, rate: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // If a timerId was provided, delete the timer after successful time entry creation
    if (timerId) {
      try {
        // Verify the timer belongs to the current user before deleting
        const timer = await prisma.timer.findUnique({
          where: { id: timerId }
        });
        
        if (timer && timer.userId === session.user.id) {
          await prisma.timer.delete({
            where: { id: timerId }
          });
        }
      } catch (timerError) {
        // Log error but don't fail the time entry creation
        console.error('Error deleting timer after time entry creation:', timerError);
      }
    }

    return NextResponse.json(timeEntry, { status: 201 });

  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}