import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create time entries (can use timers)
    const hasPermission = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'create'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the currently running timer for this user
    const activeTimer = await prisma.timer.findFirst({
      where: {
        userId: session.user.id,
        isRunning: true
      },
      include: {
        ticket: {
          select: { 
            id: true, 
            title: true,
            ticketNumber: true,
            account: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!activeTimer) {
      return NextResponse.json({ activeTimer: null });
    }

    // Calculate current elapsed time
    const currentElapsed = activeTimer.isRunning 
      ? Math.floor((Date.now() - activeTimer.startTime.getTime()) / 1000)
      : 0;

    const totalSeconds = activeTimer.pausedTime + currentElapsed;

    return NextResponse.json({
      activeTimer: {
        ...activeTimer,
        totalSeconds,
        currentElapsed
      }
    });

  } catch (error) {
    console.error('Error fetching active timer:', error);
    return NextResponse.json(
      { error: "Failed to fetch active timer" },
      { status: 500 }
    );
  }
}