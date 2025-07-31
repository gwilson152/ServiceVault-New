import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, startDate, endDate, includeUnbilledOnly = true } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
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

    // Get unbilled time entries
    const timeEntryWhere: Record<string, unknown> = {
      ticket: { customerId },
      noCharge: false,
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
      ticket: { customerId },
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
      return sum + (entry.hours * entry.billingRate);
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
          customerId,
          description: `Generated invoice ${periodDesc}`,
          subtotal,
          taxAmount,
          total,
          status: "DRAFT",
          createdBy: session.user.id,
        },
      });

      // Connect time entries
      if (timeEntries.length > 0) {
        await tx.timeEntry.updateMany({
          where: { id: { in: timeEntries.map(e => e.id) } },
          data: { invoiceId: invoice.id },
        });
      }

      // Connect ticket addons
      if (ticketAddons.length > 0) {
        await tx.ticketAddon.updateMany({
          where: { id: { in: ticketAddons.map(a => a.id) } },
          data: { invoiceId: invoice.id },
        });
      }

      return invoice;
    });

    // Fetch complete invoice data
    const invoice = await prisma.invoice.findUnique({
      where: { id: result.id },
      include: {
        customer: true,
        timeEntries: {
          include: {
            ticket: true,
            user: true,
          },
        },
        ticketAddons: {
          include: {
            ticket: true,
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