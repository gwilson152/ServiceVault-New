import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = {};
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (status) {
      whereClause.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, description, timeEntryIds, ticketAddonIds } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get time entries
      const timeEntries = timeEntryIds?.length > 0 
        ? await tx.timeEntry.findMany({
            where: { 
              id: { in: timeEntryIds },
              noCharge: false,
            },
            include: {
              ticket: true,
              user: true,
            },
          })
        : [];

      // Get ticket addons
      const ticketAddons = ticketAddonIds?.length > 0
        ? await tx.ticketAddon.findMany({
            where: { id: { in: ticketAddonIds } },
            include: {
              ticket: true,
            },
          })
        : [];

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
      const invoiceCount = await tx.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          description: description || null,
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
          where: { id: { in: timeEntryIds } },
          data: { invoiceId: invoice.id },
        });
      }

      // Connect ticket addons
      if (ticketAddons.length > 0) {
        await tx.ticketAddon.updateMany({
          where: { id: { in: ticketAddonIds } },
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

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}