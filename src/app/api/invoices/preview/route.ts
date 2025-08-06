import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view billing/invoices
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "view"
    });
    if (!canViewBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, startDate, endDate, includeUnbilledOnly = true, includeSubsidiaries = false } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get account hierarchy if including subsidiaries
    let accountIds = [accountId];
    if (includeSubsidiaries) {
      const subsidiaries = await prisma.account.findMany({
        where: { parentAccountId: accountId },
        select: { id: true }
      });
      accountIds = [...accountIds, ...subsidiaries.map(s => s.id)];
    }

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get time entries for preview
    const timeEntryWhere: Record<string, unknown> = {
      OR: [
        { ticket: { accountId: { in: accountIds } } },
        { accountId: { in: accountIds } }
      ],
      noCharge: false,
      isApproved: true, // Only include approved time entries
    };

    if (includeUnbilledOnly) {
      timeEntryWhere.invoiceItems = {
        none: {}
      };
    }

    if (Object.keys(dateFilter).length > 0) {
      timeEntryWhere.date = dateFilter;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        ticket: {
          include: {
            account: {
              select: { id: true, name: true, parentAccountId: true }
            }
          }
        },
        account: {
          select: { id: true, name: true, parentAccountId: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true }
            }
          }
        }
      },
      orderBy: { date: "asc" },
    });

    // Get ticket addons for preview
    const addonWhere: Record<string, unknown> = {
      ticket: { accountId: { in: accountIds } },
    };

    if (includeUnbilledOnly) {
      addonWhere.invoiceItems = {
        none: {}
      };
    }

    if (Object.keys(dateFilter).length > 0) {
      addonWhere.createdAt = dateFilter;
    }

    const ticketAddons = await prisma.ticketAddon.findMany({
      where: addonWhere,
      include: {
        ticket: {
          include: {
            account: {
              select: { id: true, name: true, parentAccountId: true }
            }
          }
        },
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });

    // Get account details for hierarchy context
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      include: {
        parentAccount: {
          select: { id: true, name: true }
        },
        childAccounts: {
          select: { id: true, name: true }
        }
      }
    });

    // Calculate preview totals
    const timeTotal = timeEntries.reduce((sum, entry) => {
      return sum + ((entry.minutes / 60) * (entry.billingRateValue || 0));
    }, 0);

    const addonTotal = ticketAddons.reduce((sum, addon) => {
      return sum + (addon.price * addon.quantity);
    }, 0);

    const subtotal = timeTotal + addonTotal;
    const taxAmount = subtotal * 0; // No tax for now
    const total = subtotal + taxAmount;

    // Group items by account for hierarchy display
    const itemsByAccount = timeEntries.reduce((acc, entry) => {
      const accountId = entry.ticket?.accountId || entry.accountId;
      if (!acc[accountId]) {
        acc[accountId] = { timeEntries: [], ticketAddons: [] };
      }
      acc[accountId].timeEntries.push(entry);
      return acc;
    }, {} as Record<string, { timeEntries: any[], ticketAddons: any[] }>);

    ticketAddons.forEach(addon => {
      const accountId = addon.ticket.accountId;
      if (!itemsByAccount[accountId]) {
        itemsByAccount[accountId] = { timeEntries: [], ticketAddons: [] };
      }
      itemsByAccount[accountId].ticketAddons.push(addon);
    });

    return NextResponse.json({
      accounts,
      timeEntries,
      ticketAddons,
      itemsByAccount,
      summary: {
        timeEntries: timeEntries.length,
        ticketAddons: ticketAddons.length,
        timeTotal,
        addonTotal,
        subtotal,
        taxAmount,
        total,
      },
      criteria: {
        accountId,
        startDate,
        endDate,
        includeUnbilledOnly,
        includeSubsidiaries,
        accountIds
      }
    });

  } catch (error) {
    console.error("Error previewing invoice items:", error);
    return NextResponse.json(
      { error: "Failed to preview invoice items" },
      { status: 500 }
    );
  }
}