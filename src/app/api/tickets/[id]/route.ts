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
        customer: true,
        assignedUser: true,
        createdByUser: true,
        timeEntries: {
          include: {
            user: true,
          },
          orderBy: { date: "desc" },
        },
        ticketAddons: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role-based access control
    if (session.user?.role === "CUSTOMER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { customer: true }
      });
      
      if (!user?.customer || ticket.customerId !== user.customer.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Calculate aggregated data
    const totalTimeSpent = ticket.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAddonCost = ticket.ticketAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);

    const ticketWithStats = {
      ...ticket,
      totalTimeSpent,
      totalAddonCost,
      timeEntriesCount: ticket.timeEntries.length,
      addonsCount: ticket.ticketAddons.length,
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

export async function PUT(
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
      assignedTo, 
      customFields 
    } = body;

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Role-based access control
    if (session.user?.role === "CUSTOMER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { customer: true }
      });
      
      if (!user?.customer || existingTicket.customerId !== user.customer.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Customers can only update certain fields
      if (status || assignedTo) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? priority : undefined,
        status: status !== undefined ? status : undefined,
        assignedTo: assignedTo !== undefined ? assignedTo : undefined,
        customFields: customFields !== undefined ? customFields : undefined,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        assignedUser: true,
        timeEntries: {
          include: {
            user: true,
          },
        },
        ticketAddons: true,
      },
    });

    return NextResponse.json(ticket);
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