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

    const { id: ticketId } = await params;

    // First verify the ticket exists and user has access to it
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        account: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role-based access control
    if (session.user?.role === "ACCOUNT_USER") {
      // Account users can only see their own account's tickets
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account || user.accountUser.account.id !== ticket.accountId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Fetch time entries for this ticket
    const timeEntries = await prisma.timeEntry.findMany({
      where: { ticketId: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(timeEntries);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create time entries
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "time-entries",
      action: "create"
    });
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();
    const { 
      description, 
      minutes, 
      date, 
      time,
      noCharge,
      billingRateId
    } = body;

    // Validation
    if (!description?.trim() || !minutes || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: description, minutes, date, time' },
        { status: 400 }
      );
    }

    // Verify ticket exists and get its account
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, accountId: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Combine date and time into a proper datetime
    const workDateTime = new Date(`${date}T${time}`);

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        description: description.trim(),
        minutes: parseInt(minutes),
        date: workDateTime,
        noCharge: noCharge || false,
        ticketId: ticketId,
        accountId: ticket.accountId,
        userId: session.user.id,
        billingRateId: billingRateId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { id: true, title: true, ticketNumber: true }
        },
        account: {
          select: { id: true, name: true }
        },
        billingRate: {
          select: { id: true, name: true, rate: true }
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