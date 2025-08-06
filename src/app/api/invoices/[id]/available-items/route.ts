import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First get the invoice to check account context
    const invoiceForAuth = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, accountId: true, creatorId: true, status: true }
    });

    if (!invoiceForAuth) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check permission to view invoice items with account context
    const canEditItems = await permissionService.hasPermission(
      session.user.id, 
      "invoices", 
      "edit-items",
      invoiceForAuth.accountId
    );

    if (!canEditItems) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow for DRAFT invoices
    if (invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot add items to invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    // Get unbilled time entries for this account
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        accountId: invoiceForAuth.accountId,
        invoiceItems: { none: {} }, // Not already on an invoice
        isApproved: true // Only approved time entries
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        billingRate: {
          select: {
            id: true,
            name: true,
            rate: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Get unbilled ticket addons for this account
    const addons = await prisma.ticketAddon.findMany({
      where: {
        ticket: {
          accountId: invoiceForAuth.accountId
        },
        invoiceItems: { none: {} } // Not already on an invoice
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Transform time entries for frontend
    const availableTimeEntries = timeEntries.map(entry => ({
      id: entry.id,
      description: entry.description,
      date: entry.date,
      minutes: entry.minutes,
      hours: Math.round((entry.minutes / 60) * 100) / 100, // Round to 2 decimal places
      user: entry.user,
      ticket: entry.ticket,
      billingRate: entry.billingRate,
      estimatedAmount: entry.billingRate ? Math.round((entry.minutes / 60) * entry.billingRate.rate * 100) / 100 : 0
    }));

    // Transform addons for frontend
    const availableAddons = addons.map(addon => ({
      id: addon.id,
      name: addon.name,
      description: addon.description,
      price: addon.price,
      quantity: addon.quantity,
      ticket: addon.ticket,
      estimatedAmount: Math.round(addon.price * addon.quantity * 100) / 100
    }));

    return NextResponse.json({
      timeEntries: availableTimeEntries,
      addons: availableAddons,
      summary: {
        timeEntryCount: availableTimeEntries.length,
        addonCount: availableAddons.length,
        totalTimeHours: availableTimeEntries.reduce((sum, entry) => sum + entry.hours, 0),
        estimatedTimeValue: availableTimeEntries.reduce((sum, entry) => sum + entry.estimatedAmount, 0),
        estimatedAddonValue: availableAddons.reduce((sum, addon) => sum + addon.estimatedAmount, 0)
      }
    });

  } catch (error) {
    console.error("Error fetching available items:", error);
    return NextResponse.json(
      { error: "Failed to fetch available items" },
      { status: 500 }
    );
  }
}