import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
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
        }
      }
    });

    if (!timeEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check access permissions
    const canAccess = (
      session.user.role === 'ADMIN' ||
      timeEntry.userId === session.user.id ||
      (session.user.role === 'CUSTOMER' || session.user.role === 'ACCOUNT_USER')
    );

    if (!canAccess) {
      // For customers, check if they have access to the related account
      if (session.user.role === 'CUSTOMER' || session.user.role === 'ACCOUNT_USER') {
        const userAccounts = await prisma.accountUser.findMany({
          where: { userId: session.user.id },
          select: { accountId: true }
        });
        const accountIds = userAccounts.map(ua => ua.accountId);
        
        const hasAccountAccess = (
          (timeEntry.accountId && accountIds.includes(timeEntry.accountId)) ||
          (timeEntry.ticket?.account && accountIds.includes(timeEntry.ticket.account.id))
        );

        if (!hasAccountAccess) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(timeEntry);

  } catch (error) {
    console.error('Error fetching time entry:', error);
    return NextResponse.json(
      { error: "Failed to fetch time entry" },
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check permissions - only the creator or admin can edit
    if (session.user.role !== 'ADMIN' && existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, accountId, hours, description, date, noCharge } = body;

    // Validation
    if (hours !== undefined && (hours <= 0)) {
      return NextResponse.json({ error: "Hours must be greater than 0" }, { status: 400 });
    }

    if (description !== undefined && description.trim().length === 0) {
      return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
    }

    // If changing ticket/account association, validate the new values
    if (ticketId !== undefined || accountId !== undefined) {
      if ((!ticketId && !accountId) || (ticketId && accountId)) {
        return NextResponse.json({ 
          error: "Time entry must be associated with either a ticket or an account, but not both" 
        }, { status: 400 });
      }

      // Verify ticket exists (if provided)
      if (ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId }
        });
        if (!ticket) {
          return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }
      }

      // Verify account exists (if provided)
      if (accountId) {
        const account = await prisma.account.findUnique({
          where: { id: accountId }
        });
        if (!account) {
          return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
      }
    }

    // Update time entry
    const updateData: Record<string, unknown> = {};
    if (ticketId !== undefined) updateData.ticketId = ticketId;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (hours !== undefined) updateData.hours = parseFloat(hours.toString());
    if (description !== undefined) updateData.description = description.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (noCharge !== undefined) updateData.noCharge = Boolean(noCharge);

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
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
        }
      }
    });

    return NextResponse.json(timeEntry);

  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check permissions - only the creator or admin can delete
    if (session.user.role !== 'ADMIN' && existingEntry.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.timeEntry.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Time entry deleted successfully" });

  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}