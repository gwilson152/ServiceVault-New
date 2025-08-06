import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/ticket-number-generator";
import { permissionService } from "@/lib/permissions/PermissionService";
import { applyPermissionFilter } from "@/lib/permissions/withPermissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view tickets
    const canViewTickets = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "tickets",
      action: "view"
    });
    if (!canViewTickets) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    // Build where clause based on filters
    const whereClause: Record<string, unknown> = {};

    // Apply customer filter if provided
    if (customerId) {
      whereClause.accountId = customerId;
    }

    // Apply additional filters
    if (status) {
      whereClause.status = status;
    }
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        whereClause.assigneeId = null;
      } else {
        whereClause.assigneeId = assignedTo;
      }
    }
    if (priority) {
      whereClause.priority = priority;
    }

    // Handle search - search across title, description, and ticket number
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { ticketNumber: { contains: search, mode: "insensitive" } }
      ];
    }

    // Build base query
    const query = {
      where: whereClause,
      include: {
        account: true,
        assignee: true,
        creator: true,
        timeEntries: {
          include: {
            user: true,
          },
        },
        addons: true,
      },
      orderBy: { createdAt: "desc" as const },
    };

    // Apply permission filtering
    const filteredQuery = await applyPermissionFilter(
      session.user.id,
      "tickets",
      query
    );

    const tickets = await prisma.ticket.findMany(filteredQuery);

    // Calculate aggregated data for each ticket
    const ticketsWithStats = tickets.map(ticket => ({
      ...ticket,
      totalTimeSpent: ticket.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0),
      totalAddonCost: ticket.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0),
      timeEntriesCount: ticket.timeEntries.length,
      addonsCount: ticket.addons.length,
    }));

    return NextResponse.json({ tickets: ticketsWithStats });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create tickets
    const canCreateTickets = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "tickets",
      action: "create"
    });
    if (!canCreateTickets) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      priority, 
      accountId, 
      assigneeId, 
      assignedAccountUserId,
      customFields,
      addons 
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Validate account
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Check if user has permission to create tickets for this account
    const canCreateForAccount = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "tickets",
      action: "create",
      accountId
    });

    if (!canCreateForAccount) {
      return NextResponse.json({ error: "No permission to create tickets for this account" }, { status: 403 });
    }

    const creatorId = session.user.id;

    // Validate assignee (agent/employee) if provided
    if (assigneeId && assigneeId !== "unassigned") {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId }
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee not found" },
          { status: 400 }
        );
      }

      // Check if assignee has permission to be assigned tickets
      const canBeAssignedTickets = await permissionService.hasPermission({
        userId: assignee.id,
        resource: "tickets",
        action: "assignable-to",
        accountId
      });

      if (!canBeAssignedTickets) {
        return NextResponse.json(
          { error: "Selected user cannot be assigned tickets" },
          { status: 403 }
        );
      }
    }

    // Validate assigned account user if provided
    if (assignedAccountUserId && assignedAccountUserId !== "unassigned") {
      const assignedMembership = await prisma.accountMembership.findUnique({
        where: { id: assignedAccountUserId },
        include: {
          user: true,
          account: true
        }
      });

      if (!assignedMembership) {
        return NextResponse.json(
          { error: "Account membership not found" },
          { status: 400 }
        );
      }

      // Assigned account user must belong to the same account as the ticket
      if (assignedMembership.accountId !== accountId) {
        return NextResponse.json(
          { error: "Account user must belong to the same account as the ticket" },
          { status: 400 }
        );
      }

      // Check if this account user can have tickets created for them
      if (assignedMembership.user) {
        const canHaveTicketsCreatedFor = await permissionService.hasPermission({
          userId: assignedMembership.user.id,
          resource: "tickets",
          action: "assignable-for",
          accountId
        });

        if (!canHaveTicketsCreatedFor) {
          return NextResponse.json(
            { error: "Tickets cannot be created for the selected account user" },
            { status: 403 }
          );
        }
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get account name for ticket number generation
      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { name: true }
      });

      if (!account) {
        throw new Error("Account not found");
      }

      // Generate ticket number
      const ticketNumber = await generateTicketNumber(account.name);

      // Create ticket
      const ticket = await tx.ticket.create({
        data: {
          title,
          description,
          priority: priority || "MEDIUM",
          status: "OPEN",
          ticketNumber,
          accountId: accountId,
          assigneeId: assigneeId === "unassigned" ? null : assigneeId,
          assignedAccountUserId: assignedAccountUserId === "unassigned" ? null : assignedAccountUserId,
          creatorId: creatorId,
          customFields: customFields || {},
        },
      });

      // Create ticket addons if provided
      if (addons && addons.length > 0) {
        await tx.ticketAddon.createMany({
          data: addons.map((addon: { name: string; description?: string; price: string; quantity: string }) => ({
            ticketId: ticket.id,
            name: addon.name,
            description: addon.description || null,
            price: parseFloat(addon.price),
            quantity: parseInt(addon.quantity),
          })),
        });
      }

      return ticket;
    });

    // Fetch complete ticket data
    const ticket = await prisma.ticket.findUnique({
      where: { id: result.id },
      include: {
        account: true,
        assignee: true,
        assignedAccountUser: true,
        creator: true,
        addons: true,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}