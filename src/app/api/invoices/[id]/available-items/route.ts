import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

// Recursive function to get all child account IDs
async function getAllChildAccountIds(accountId: string): Promise<string[]> {
  const children = await prisma.account.findMany({
    where: { parentId: accountId },
    select: { id: true }
  });
  
  let allChildIds: string[] = children.map(child => child.id);
  
  // Recursively get children of children
  for (const child of children) {
    const grandChildren = await getAllChildAccountIds(child.id);
    allChildIds = allChildIds.concat(grandChildren);
  }
  
  return allChildIds;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const includeSubsidiaries = searchParams.get('includeSubsidiaries') === 'true';

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
    const canEditItems = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "invoices",
      action: "edit-items",
      accountId: invoiceForAuth.accountId
    });

    if (!canEditItems) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow for DRAFT invoices
    if (invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot add items to invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    // Determine which account IDs to include
    let accountIds = [invoiceForAuth.accountId];
    if (includeSubsidiaries) {
      const childAccountIds = await getAllChildAccountIds(invoiceForAuth.accountId);
      accountIds = accountIds.concat(childAccountIds);
    }

    // Get unbilled time entries through multiple pathways:
    // 1. Direct account match (time entry accountId)
    // 2. Ticket relationship (time entry ticket belongs to invoice account)
    // 3. Hierarchical relationships (including subsidiaries if requested)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        AND: [
          { invoiceItems: { none: {} } }, // Not already on an invoice
          { isApproved: true }, // Only approved time entries
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

    console.log(`Found ${timeEntries.length} time entries for invoice account ${invoiceForAuth.accountId}`);

    // Get unbilled ticket addons for this account (and subsidiaries if requested)
    const addons = await prisma.ticketAddon.findMany({
      where: {
        ticket: {
          accountId: { in: accountIds }
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