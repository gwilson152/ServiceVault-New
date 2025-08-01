import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employees and admins can use timers
    if (session.user.role !== 'EMPLOYEE' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find all active timers for this user (running OR paused with accumulated time)
    const activeTimers = await prisma.timer.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { isRunning: true },
          { 
            isRunning: false, 
            pausedTime: { gt: 0 } 
          }
        ]
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
      },
      orderBy: { updatedAt: 'desc' } // Most recently updated first
    });

    // Calculate current elapsed time for each timer
    const timersWithElapsed = activeTimers.map(timer => {
      const currentElapsed = timer.isRunning 
        ? Math.floor((Date.now() - timer.startTime.getTime()) / 1000)
        : 0;

      const totalSeconds = timer.pausedTime + currentElapsed;

      return {
        ...timer,
        totalSeconds,
        currentElapsed
      };
    });

    return NextResponse.json({
      activeTimers: timersWithElapsed,
      count: timersWithElapsed.length
    });

  } catch (error) {
    console.error('Error fetching active timers:', error);
    return NextResponse.json(
      { error: "Failed to fetch active timers" },
      { status: 500 }
    );
  }
}