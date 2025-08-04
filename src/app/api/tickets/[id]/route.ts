import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        account: true,
        assignee: true,
        assignedAccountUser: true,
        creator: true,
        accountUserCreator: true,
        timeEntries: {
          include: {
            user: true,
          },
          orderBy: { date: "desc" },
        },
        addons: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role-based access control
    if (session.user?.role === "ACCOUNT_USER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account || ticket.accountId !== user.accountUser.account.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Calculate aggregated data
    const totalTimeSpent = ticket.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
    const totalAddonCost = ticket.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);

    const ticketWithStats = {
      ...ticket,
      totalTimeSpent,
      totalAddonCost,
      timeEntriesCount: ticket.timeEntries.length,
      addonsCount: ticket.addons.length,
    };

    return NextResponse.json(ticketWithStats);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();
    const { 
      title, 
      description, 
      priority, 
      status, 
      accountId,
      assigneeId, 
      assignedAccountUserId,
      customFields 
    } = body;

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { account: true }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role-based access control
    if (session.user?.role === "ACCOUNT_USER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account || existingTicket.accountId !== user.accountUser.account.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Account users can only update certain fields
      if (status || assigneeId || accountId) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    // Validate assignee (agent/employee) if being updated
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "unassigned") {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId }
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee not found" },
          { status: 400 }
        );
      }

      // Assignee must be an employee or admin, not an account user
      if (assignee.role === "ACCOUNT_USER") {
        return NextResponse.json(
          { error: "Only employees and admins can be assigned as agents to work on tickets" },
          { status: 400 }
        );
      }
    }

    // Validate assigned account user if being updated
    if (assignedAccountUserId !== undefined && assignedAccountUserId !== null && assignedAccountUserId !== "unassigned") {
      const assignedAccountUser = await prisma.accountUser.findUnique({
        where: { id: assignedAccountUserId }
      });

      if (!assignedAccountUser) {
        return NextResponse.json(
          { error: "Account user not found" },
          { status: 400 }
        );
      }

      // Assigned account user must belong to the same account as the ticket
      const targetAccountId = accountId || existingTicket.accountId;
      if (assignedAccountUser.accountId !== targetAccountId) {
        return NextResponse.json(
          { error: "Account user must belong to the same account as the ticket" },
          { status: 400 }
        );
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId === "unassigned" ? null : assigneeId;
    if (assignedAccountUserId !== undefined) updateData.assignedAccountUserId = assignedAccountUserId === "unassigned" ? null : assignedAccountUserId;
    if (customFields !== undefined) updateData.customFields = customFields;

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        account: true,
        assignee: true,
        assignedAccountUser: true,
        creator: true,
        accountUserCreator: true,
        timeEntries: {
          include: {
            user: true,
          },
        },
        addons: true,
      },
    });

    // Calculate aggregated data
    const totalTimeSpent = ticket.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
    const totalAddonCost = ticket.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);

    const ticketWithStats = {
      ...ticket,
      totalTimeSpent,
      totalAddonCost,
      timeEntriesCount: ticket.timeEntries.length,
      addonsCount: ticket.addons.length,
    };

    return NextResponse.json(ticketWithStats);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ticketId } = await params;

    // Start transaction to delete ticket and related data
    await prisma.$transaction(async (tx) => {
      // Delete time entries
      await tx.timeEntry.deleteMany({
        where: { ticketId: ticketId },
      });

      // Delete ticket addons
      await tx.ticketAddon.deleteMany({
        where: { ticketId: ticketId },
      });

      // Delete ticket
      await tx.ticket.delete({
        where: { id: ticketId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}