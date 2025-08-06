import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";
import { applyPermissionFilter } from "@/lib/permissions/withPermissions";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view dashboard
    const canViewDashboard = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "dashboard",
      action: "view"
    });

    if (!canViewDashboard) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = await permissionService.getUserPermissions(session.user.id);
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get active tickets count (filtered by permissions)
    const ticketQuery = await applyPermissionFilter(
      session.user.id,
      "tickets",
      {
        where: {
          status: {
            in: ["OPEN", "IN_PROGRESS", "REVIEW"]
          }
        }
      }
    );
    const activeTickets = await prisma.ticket.count(ticketQuery);

    // Get hours logged this week (filtered by permissions)
    const weekTimeQuery = await applyPermissionFilter(
      session.user.id,
      "time-entries",
      {
        where: {
          date: {
            gte: weekStart,
            lte: weekEnd
          }
        }
      }
    );
    const weekTimeEntries = await prisma.timeEntry.aggregate({
      _sum: {
        minutes: true
      },
      where: weekTimeQuery.where
    });
    const weekHours = (weekTimeEntries._sum.minutes || 0) / 60;

    // Get total accounts count (filtered by permissions)
    const accountQuery = await applyPermissionFilter(
      session.user.id,
      "accounts",
      {},
      "id"
    );
    const totalAccounts = await prisma.account.count(accountQuery);

    // Get monthly revenue (sum of invoiced time entries this month)
    const revenueQuery = await applyPermissionFilter(
      session.user.id,
      "time-entries",
      {
        where: {
          date: {
            gte: monthStart
          },
          noCharge: false,
          billingRateId: { not: null }
        }
      }
    );
    // Calculate monthly revenue by fetching time entries and calculating manually
    const revenueEntries = await prisma.timeEntry.findMany({
      where: revenueQuery.where,
      select: {
        minutes: true,
        billingRateValue: true
      }
    });
    
    const monthlyRevenue = revenueEntries.reduce((total, entry) => {
      if (entry.minutes && entry.billingRateValue) {
        const hours = entry.minutes / 60;
        return total + (hours * entry.billingRateValue);
      }
      return total;
    }, 0);

    // Get recent tickets (filtered by permissions)
    const recentTicketsQuery = await applyPermissionFilter(
      session.user.id,
      "tickets",
      {
        take: 5,
        orderBy: {
          createdAt: 'desc' as const
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
      }
    );
    const recentTickets = await prisma.ticket.findMany(recentTicketsQuery);

    // Get recent activity (filtered by permissions)
    const recentActivity = [];

    // Get recent tickets created
    const recentTicketsCreatedQuery = await applyPermissionFilter(
      session.user.id,
      "tickets",
      {
        take: 3,
        orderBy: {
          createdAt: 'desc' as const
        },
        include: {
          account: true
        }
      }
    );
    const recentTicketsCreated = await prisma.ticket.findMany(recentTicketsCreatedQuery);

    recentTicketsCreated.forEach(ticket => {
      recentActivity.push({
        type: 'ticket_created',
        message: `New ticket created by ${ticket.account.name}`,
        ticketId: ticket.id,
        timestamp: ticket.createdAt
      });
    });

    // Get recent time entries
    const recentTimeEntriesQuery = await applyPermissionFilter(
      session.user.id,
      "time-entries",
      {
        take: 3,
        orderBy: {
          createdAt: 'desc' as const
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
      }
    );
    const recentTimeEntries = await prisma.timeEntry.findMany(recentTimeEntriesQuery);

    recentTimeEntries.forEach(entry => {
      recentActivity.push({
        type: 'time_logged',
        message: `Time entry logged for ${entry.ticket?.ticketNumber || 'direct entry'}`,
        ticketId: entry.ticketId,
        minutes: entry.minutes,
        timestamp: entry.createdAt
      });
    });

    // Get recent invoices (if user has permission)
    if (await permissionService.hasPermission({ userId: session.user.id, resource: 'invoices', action: 'view' })) {
      const recentInvoicesQuery = await applyPermissionFilter(
        session.user.id,
        "invoices",
        {
          take: 2,
          orderBy: {
            createdAt: 'desc' as const
          }
        }
      );
      const recentInvoices = await prisma.invoice.findMany(recentInvoicesQuery);

      recentInvoices.forEach(invoice => {
        recentActivity.push({
          type: 'invoice_generated',
          message: `Invoice #${invoice.invoiceNumber} generated`,
          invoiceId: invoice.id,
          timestamp: invoice.createdAt
        });
      });
    }

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
        monthlyRevenue: monthlyRevenue || 0
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
      activeTimers,
      isSuperAdmin: permissions.isSuperAdmin
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}