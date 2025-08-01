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

    // Check permission to create billing/invoices
    const canCreateBilling = await hasPermission(session.user.id, { resource: "billing", action: "create" });
    if (!canCreateBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, startDate, endDate, includeUnbilledOnly = true } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get unbilled time entries (only approved entries)
    const timeEntryWhere: Record<string, unknown> = {
      ticket: { accountId },
      noCharge: false,
      isApproved: true, // Only include approved time entries
    };

    if (includeUnbilledOnly) {
      timeEntryWhere.invoiceId = null;
    }

    if (Object.keys(dateFilter).length > 0) {
      timeEntryWhere.date = dateFilter;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        ticket: true,
        user: true,
      },
      orderBy: { date: "asc" },
    });

    // Get unbilled ticket addons
    const addonWhere: Record<string, unknown> = {
      ticket: { accountId },
    };

    if (includeUnbilledOnly) {
      addonWhere.invoiceId = null;
    }

    if (Object.keys(dateFilter).length > 0) {
      addonWhere.createdAt = dateFilter;
    }

    const ticketAddons = await prisma.ticketAddon.findMany({
      where: addonWhere,
      include: {
        ticket: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (timeEntries.length === 0 && ticketAddons.length === 0) {
      return NextResponse.json(
        { error: "No billable items found for the specified criteria" },
        { status: 400 }
      );
    }

    // Calculate totals
    const timeTotal = timeEntries.reduce((sum, entry) => {
      return sum + ((entry.minutes / 60) * entry.billingRate);
    }, 0);

    const addonTotal = ticketAddons.reduce((sum, addon) => {
      return sum + (addon.price * addon.quantity);
    }, 0);

    const subtotal = timeTotal + addonTotal;
    const taxAmount = subtotal * 0; // No tax for now
    const total = subtotal + taxAmount;

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;

    // Create description
    const periodDesc = startDate && endDate 
      ? `for period ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : "for unbilled items";

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          accountId,
          notes: `Generated invoice ${periodDesc}`,
          subtotal,
          tax: taxAmount,
          total,
          status: "DRAFT",
          creatorId: session.user.id,
        },
      });

      // Create invoice items from time entries
      if (timeEntries.length > 0) {
        const timeEntryItems = timeEntries.map(entry => ({
          invoiceId: invoice.id,
          timeEntryId: entry.id,
          description: entry.description || 'Time entry',
          quantity: entry.minutes / 60,
          rate: entry.billingRateValue || 0,
          amount: (entry.minutes / 60) * (entry.billingRateValue || 0),
        }));

        await tx.invoiceItem.createMany({
          data: timeEntryItems,
        });
      }

      // Create invoice items from ticket addons
      if (ticketAddons.length > 0) {
        const addonItems = ticketAddons.map(addon => ({
          invoiceId: invoice.id,
          ticketAddonId: addon.id,
          description: addon.name,
          quantity: addon.quantity,
          rate: addon.price,
          amount: addon.quantity * addon.price,
        }));

        await tx.invoiceItem.createMany({
          data: addonItems,
        });
      }

      return invoice;
    });

    // Fetch complete invoice data
    const invoice = await prisma.invoice.findUnique({
      where: { id: result.id },
      include: {
        account: true,
        items: {
          include: {
            timeEntry: {
              include: {
                ticket: true,
                user: true,
              },
            },
            ticketAddon: {
              include: {
                ticket: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      invoice,
      summary: {
        timeEntries: timeEntries.length,
        ticketAddons: ticketAddons.length,
        timeTotal,
        addonTotal,
        subtotal,
        taxAmount,
        total,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}