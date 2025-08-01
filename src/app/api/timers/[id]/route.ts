import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const timer = await prisma.timer.findUnique({
      where: { id },
      include: {
        ticket: {
          select: { 
            id: true, 
            title: true,
            account: {
              select: { id: true, name: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!timer) {
      return NextResponse.json({ error: "Timer not found" }, { status: 404 });
    }

    // Check permissions - only the owner or admin can view
    if (session.user.role !== 'ADMIN' && timer.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(timer);

  } catch (error) {
    console.error('Error fetching timer:', error);
    return NextResponse.json(
      { error: "Failed to fetch timer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingTimer = await prisma.timer.findUnique({
      where: { id }
    });

    if (!existingTimer) {
      return NextResponse.json({ error: "Timer not found" }, { status: 404 });
    }

    // Check permissions - only the owner or admin can update
    if (session.user.role !== 'ADMIN' && existingTimer.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { action, pausedTime } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (action === 'pause') {
      // Calculate elapsed time since start and add to paused time
      const elapsedSeconds = Math.floor((Date.now() - existingTimer.startTime.getTime()) / 1000);
      updateData.pausedTime = existingTimer.pausedTime + elapsedSeconds;
      updateData.isRunning = false;
    } else if (action === 'resume') {
      updateData.isRunning = true;
      updateData.startTime = new Date();
    } else if (action === 'stop') {
      // Calculate final elapsed time if timer was running
      if (existingTimer.isRunning) {
        const elapsedSeconds = Math.floor((Date.now() - existingTimer.startTime.getTime()) / 1000);
        updateData.pausedTime = existingTimer.pausedTime + elapsedSeconds;
      }
      updateData.isRunning = false;
    } else if (pausedTime !== undefined) {
      // Manual update of paused time
      updateData.pausedTime = Math.max(0, parseInt(pausedTime.toString()));
    }

    const timer = await prisma.timer.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(timer);

  } catch (error) {
    console.error('Error updating timer:', error);
    return NextResponse.json(
      { error: "Failed to update timer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingTimer = await prisma.timer.findUnique({
      where: { id }
    });

    if (!existingTimer) {
      return NextResponse.json({ error: "Timer not found" }, { status: 404 });
    }

    // Check permissions - only the owner or admin can delete
    if (session.user.role !== 'ADMIN' && existingTimer.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.timer.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Timer deleted successfully" });

  } catch (error) {
    console.error('Error deleting timer:', error);
    return NextResponse.json(
      { error: "Failed to delete timer" },
      { status: 500 }
    );
  }
}