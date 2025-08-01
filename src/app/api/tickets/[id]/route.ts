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

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        account: true,
        assignee: true,
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
    const totalTimeSpent = ticket.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
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

    const body = await request.json();
    const { 
      title, 
      description, 
      priority, 
      status, 
      accountId,
      assigneeId, 
      customFields 
    } = body;

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
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

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (customFields !== undefined) updateData.customFields = customFields;

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        account: true,
        assignee: true,
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
    const totalTimeSpent = ticket.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
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

    // Start transaction to delete ticket and related data
    await prisma.$transaction(async (tx) => {
      // Delete time entries
      await tx.timeEntry.deleteMany({
        where: { ticketId: params.id },
      });

      // Delete ticket addons
      await tx.ticketAddon.deleteMany({
        where: { ticketId: params.id },
      });

      // Delete ticket
      await tx.ticket.delete({
        where: { id: params.id },
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