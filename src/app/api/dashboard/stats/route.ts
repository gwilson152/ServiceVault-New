import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isEmployee = session.user.role === "EMPLOYEE" || isAdmin;

    if (!isEmployee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get active tickets count
    const activeTickets = await prisma.ticket.count({
      where: {
        status: {
          in: ["OPEN", "IN_PROGRESS", "REVIEW"]
        }
      }
    });

    // Get hours logged this week
    const weekTimeEntries = await prisma.timeEntry.aggregate({
      _sum: {
        minutes: true
      },
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd
        },
        ...(isAdmin ? {} : { userId: session.user.id })
      }
    });
    const weekHours = (weekTimeEntries._sum.minutes || 0) / 60;

    // Get total accounts count
    const totalAccounts = await prisma.account.count();

    // Get monthly revenue (sum of invoiced time entries this month)
    const monthlyRevenue = await prisma.timeEntry.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        date: {
          gte: monthStart
        },
        noCharge: false,
        billingRateId: { not: null }
      }
    });

    // Get recent tickets
    const recentTickets = await prisma.ticket.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        account: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Get recent activity
    const recentActivity = [];

    // Get recent tickets created
    const recentTicketsCreated = await prisma.ticket.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        account: true
      }
    });

    recentTicketsCreated.forEach(ticket => {
      recentActivity.push({
        type: 'ticket_created',
        message: `New ticket created by ${ticket.account.name}`,
        ticketId: ticket.id,
        timestamp: ticket.createdAt
      });
    });

    // Get recent time entries
    const recentTimeEntries = await prisma.timeEntry.findMany({
      take: 3,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        ticket: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    recentTimeEntries.forEach(entry => {
      recentActivity.push({
        type: 'time_logged',
        message: `Time entry logged for ${entry.ticket.ticketNumber}`,
        ticketId: entry.ticketId,
        minutes: entry.minutes,
        timestamp: entry.createdAt
      });
    });

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 2,
      orderBy: {
        createdAt: 'desc'
      }
    });

    recentInvoices.forEach(invoice => {
      recentActivity.push({
        type: 'invoice_generated',
        message: `Invoice #${invoice.invoiceNumber} generated`,
        invoiceId: invoice.id,
        timestamp: invoice.createdAt
      });
    });

    // Sort activity by timestamp
    recentActivity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get user's active timers
    const activeTimers = await prisma.timer.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        ticket: {
          include: {
            account: true
          }
        }
      }
    });

    return NextResponse.json({
      stats: {
        activeTickets,
        weekHours: weekHours.toFixed(1),
        totalAccounts,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0
      },
      recentTickets: recentTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        accountName: ticket.account.name,
        priority: ticket.priority,
        status: ticket.status,
        assigneeName: ticket.assignee?.name || "Unassigned"
      })),
      recentActivity: recentActivity.slice(0, 5),
      activeTimers
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}