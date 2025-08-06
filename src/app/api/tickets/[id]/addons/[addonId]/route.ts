import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, quantity } = body;

    if (!name || !price || !quantity) {
      return NextResponse.json(
        { error: "Name, price, and quantity are required" },
        { status: 400 }
      );
    }

    // Check if addon exists and user has access
    const addon = await prisma.ticketAddon.findUnique({
      where: { id: resolvedParams.addonId },
      include: { 
        ticket: { 
          include: { account: true } 
        } 
      }
    });

    if (!addon) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 });
    }

    if (addon.ticketId !== resolvedParams.id) {
      return NextResponse.json({ error: "Addon does not belong to this ticket" }, { status: 400 });
    }

    // Role-based access control
    if (session.user?.role === "ACCOUNT_USER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account || addon.ticket.accountId !== user.accountUser.account.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const updatedAddon = await prisma.ticketAddon.update({
      where: { id: resolvedParams.addonId },
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        quantity: parseInt(quantity),
      },
    });

    return NextResponse.json(updatedAddon);
  } catch (error) {
    console.error("Error updating ticket addon:", error);
    return NextResponse.json(
      { error: "Failed to update ticket addon" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if addon exists and user has access
    const addon = await prisma.ticketAddon.findUnique({
      where: { id: resolvedParams.addonId },
      include: { 
        ticket: { 
          include: { account: true } 
        } 
      }
    });

    if (!addon) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 });
    }

    if (addon.ticketId !== resolvedParams.id) {
      return NextResponse.json({ error: "Addon does not belong to this ticket" }, { status: 400 });
    }

    // Role-based access control
    if (session.user?.role === "ACCOUNT_USER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accountUser: { include: { account: true } } }
      });
      
      if (!user?.accountUser?.account || addon.ticket.accountId !== user.accountUser.account.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await prisma.ticketAddon.delete({
      where: { id: resolvedParams.addonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket addon:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket addon" },
      { status: 500 }
    );
  }
}