import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/ticket-number-generator";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view tickets
    const canViewTickets = await hasPermission(session.user.id, { resource: "tickets", action: "view" });
    if (!canViewTickets) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    // Build where clause based on user role and filters
    const whereClause: Record<string, unknown> = {};

    // Role-based filtering
    if (session.user?.role === "ACCOUNT_USER") {
      // Account users can only see their own account's tickets
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      
      whereClause.accountId = user.accountUser.account.id;
    } else if (customerId) {
      // Admins and employees can filter by account (customer)
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

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

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
    const canCreateTickets = await hasPermission(session.user.id, { resource: "tickets", action: "create" });
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

    // Role-based validation
    let finalAccountId = accountId;
    const creatorId = session.user.id;
    let accountUserCreatorId = null;

    if (session.user?.role === "ACCOUNT_USER") {
      // Account users can only create tickets for themselves
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      
      finalAccountId = user.accountUser.account.id;
      accountUserCreatorId = user.accountUser.id;
    }

    if (!finalAccountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

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

      // Assignee must be an employee or admin, not an account user
      if (assignee.role === "ACCOUNT_USER") {
        return NextResponse.json(
          { error: "Only employees and admins can be assigned as agents to work on tickets" },
          { status: 400 }
        );
      }
    }

    // Validate assigned account user if provided
    if (assignedAccountUserId && assignedAccountUserId !== "unassigned") {
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
      if (assignedAccountUser.accountId !== finalAccountId) {
        return NextResponse.json(
          { error: "Account user must belong to the same account as the ticket" },
          { status: 400 }
        );
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get account name for ticket number generation
      const account = await tx.account.findUnique({
        where: { id: finalAccountId },
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
          accountId: finalAccountId,
          assigneeId: assigneeId === "unassigned" ? null : assigneeId,
          assignedAccountUserId: assignedAccountUserId === "unassigned" ? null : assignedAccountUserId,
          creatorId: creatorId,
          accountUserCreatorId: accountUserCreatorId,
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
        accountUserCreator: true,
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