import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTicketNumber } from "@/lib/ticket-number-generator";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");

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
      whereClause.assigneeId = assignedTo;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
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

    const body = await request.json();
    const { 
      title, 
      description, 
      priority, 
      accountId, 
      assigneeId, 
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
          assigneeId: assigneeId || null,
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