import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create time entries (timers are used to create time entries)
    const canCreateTimeEntries = await hasPermission(session.user.id, { resource: "time-entries", action: "create" });
    if (!canCreateTimeEntries) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    const where: Record<string, unknown> = {
      userId: session.user.id
    };

    if (ticketId) {
      where.ticketId = ticketId;
    }

    const timers = await prisma.timer.findMany({
      where,
      include: {
        ticket: {
          select: { 
            id: true, 
            title: true,
            account: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ timers });

  } catch (error) {
    console.error('Error fetching timers:', error);
    return NextResponse.json(
      { error: "Failed to fetch timers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create time entries (timers are used to create time entries)
    const canCreateTimeEntries = await hasPermission(session.user.id, { resource: "time-entries", action: "create" });
    if (!canCreateTimeEntries) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId } = body;

    // Validation
    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { account: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check access permissions based on ticket assignments and permissions
    const canCreateAccountTimeEntries = await hasPermission(session.user.id, { 
      resource: "time-entries", 
      action: "create", 
      scope: "account" 
    });
    
    // If user doesn't have account-wide permissions, check if they can only work on assigned tickets
    if (!canCreateAccountTimeEntries) {
      const hasAccess = ticket.assigneeId === session.user.id || !ticket.assigneeId;
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this ticket" }, { status: 403 });
      }
    }

    // Check if timer already exists for this user/ticket combo
    const existingTimer = await prisma.timer.findUnique({
      where: {
        userId_ticketId: {
          userId: session.user.id,
          ticketId: ticketId
        }
      }
    });

    if (existingTimer && existingTimer.isRunning) {
      return NextResponse.json({ 
        error: "Timer already running for this ticket" 
      }, { status: 400 });
    }

    let timer;
    if (existingTimer) {
      // Resume existing timer
      timer = await prisma.timer.update({
        where: { id: existingTimer.id },
        data: { 
          isRunning: true,
          startTime: new Date(),
          updatedAt: new Date()
        },
        include: {
          ticket: {
            select: { 
              id: true, 
              title: true,
              account: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
    } else {
      // Create new timer
      timer = await prisma.timer.create({
        data: {
          userId: session.user.id,
          ticketId: ticketId,
          isRunning: true
        },
        include: {
          ticket: {
            select: { 
              id: true, 
              title: true,
              account: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
    }

    return NextResponse.json(timer, { status: 201 });

  } catch (error) {
    console.error('Error creating/starting timer:', error);
    return NextResponse.json(
      { error: "Failed to start timer" },
      { status: 500 }
    );
  }
}