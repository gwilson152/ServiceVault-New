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

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { account: true }
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

    const addons = await prisma.ticketAddon.findMany({
      where: { ticketId: ticketId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(addons);
  } catch (error) {
    console.error("Error fetching ticket addons:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket addons" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { name, description, price, quantity } = body;

    if (!name || !price || !quantity) {
      return NextResponse.json(
        { error: "Name, price, and quantity are required" },
        { status: 400 }
      );
    }

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { account: true }
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

      // Check if account user is allowed to add addons (this would be configured in permissions)
      // For now, we'll allow it but this should be permission-controlled
    }

    const addon = await prisma.ticketAddon.create({
      data: {
        ticketId: ticketId,
        name,
        description: description || null,
        price: parseFloat(price),
        quantity: parseInt(quantity),
      },
    });

    return NextResponse.json(addon, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket addon:", error);
    return NextResponse.json(
      { error: "Failed to create ticket addon" },
      { status: 500 }
    );
  }
}