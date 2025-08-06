import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First get the invoice to check account context and status
    const invoiceForAuth = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, accountId: true, creatorId: true, status: true }
    });

    if (!invoiceForAuth) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check permission to edit invoice items with account context
    const canEditItems = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "invoices",
      action: "edit-items",
      accountId: invoiceForAuth.accountId
    });

    if (!canEditItems) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT invoices
    if (invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot modify items in invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    const body = await request.json();
    const { timeEntryIds = [], addonIds = [] } = body;

    if (!Array.isArray(timeEntryIds) || !Array.isArray(addonIds)) {
      return NextResponse.json({ 
        error: "timeEntryIds and addonIds must be arrays" 
      }, { status: 400 });
    }

    if (timeEntryIds.length === 0 && addonIds.length === 0) {
      return NextResponse.json({ 
        error: "At least one time entry or addon must be specified" 
      }, { status: 400 });
    }

    const newItems = [];

    // Determine which account IDs to include (same logic as available-items)
    let accountIds = [invoiceForAuth.accountId];
    // Note: We don't check includeSubsidiaries here since the frontend should only send 
    // time entry IDs that were already validated in the available-items call

    // Add time entries
    if (timeEntryIds.length > 0) {
      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          AND: [
            { id: { in: timeEntryIds } },
            { invoiceItems: { none: {} } }, // Ensure not already on an invoice
            {
              OR: [
                // Direct account match
                { accountId: { in: accountIds } },
                // Ticket belongs to invoice account(s)
                {
                  ticket: {
                    accountId: { in: accountIds }
                  }
                }
              ]
            }
          ]
        },
        include: {
          ticket: true,
          user: true,
          billingRate: true
        }
      });

      if (timeEntries.length !== timeEntryIds.length) {
        return NextResponse.json({ 
          error: "Some time entries not found or already billed" 
        }, { status: 400 });
      }

      // Create invoice items for time entries
      for (const timeEntry of timeEntries) {
        const hours = timeEntry.minutes / 60;
        const rate = timeEntry.billingRate?.rate || 0;
        const amount = hours * rate;

        newItems.push({
          invoiceId: resolvedParams.id,
          timeEntryId: timeEntry.id,
          description: `${timeEntry.user.name} - ${timeEntry.description || 'Time entry'}${timeEntry.ticket ? ` (Ticket ${timeEntry.ticket.ticketNumber})` : ''}`,
          quantity: hours,
          rate: rate,
          amount: amount
        });
      }
    }

    // Add addons
    if (addonIds.length > 0) {
      const addons = await prisma.ticketAddon.findMany({
        where: {
          id: { in: addonIds },
          ticket: {
            accountId: { in: accountIds } // Use same account filtering as time entries
          },
          invoiceItems: { none: {} } // Ensure not already on an invoice
        },
        include: {
          ticket: true
        }
      });

      if (addons.length !== addonIds.length) {
        return NextResponse.json({ 
          error: "Some addons not found or already billed" 
        }, { status: 400 });
      }

      // Create invoice items for addons
      for (const addon of addons) {
        const amount = addon.price * addon.quantity;

        newItems.push({
          invoiceId: resolvedParams.id,
          addonId: addon.id,
          description: `${addon.name} - ${addon.description || 'Ticket addon'} (Ticket ${addon.ticket.ticketNumber})`,
          quantity: addon.quantity,
          rate: addon.price,
          amount: amount
        });
      }
    }

    // Add items and recalculate invoice totals in a transaction
    await prisma.$transaction(async (tx) => {
      // Create the new invoice items
      await tx.invoiceItem.createMany({
        data: newItems
      });

      // Recalculate invoice total
      const allItems = await tx.invoiceItem.findMany({
        where: { invoiceId: resolvedParams.id }
      });

      const total = allItems.reduce((sum, item) => sum + item.amount, 0);

      // Update invoice total
      await tx.invoice.update({
        where: { id: resolvedParams.id },
        data: {
          total,
          updatedAt: new Date()
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      itemsAdded: newItems.length,
      timeEntriesAdded: timeEntryIds.length,
      addonsAdded: addonIds.length
    });

  } catch (error) {
    console.error("Error adding invoice items:", error);
    return NextResponse.json(
      { error: "Failed to add invoice items" },
      { status: 500 }
    );
  }
}