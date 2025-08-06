import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const resolvedParams = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First get the invoice and item to check context
    const invoiceItem = await prisma.invoiceItem.findUnique({
      where: { id: resolvedParams.itemId },
      include: {
        invoice: {
          select: { id: true, accountId: true, creatorId: true, status: true }
        }
      }
    });

    if (!invoiceItem) {
      return NextResponse.json({ error: "Invoice item not found" }, { status: 404 });
    }

    // Verify item belongs to the specified invoice
    if (invoiceItem.invoiceId !== resolvedParams.id) {
      return NextResponse.json({ error: "Invoice item does not belong to this invoice" }, { status: 400 });
    }

    // Check permission to edit invoice items with account context
    const canEditItems = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "invoices",
      action: "edit-items",
      accountId: invoiceItem.invoice.accountId
    });

    if (!canEditItems) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT invoices
    if (invoiceItem.invoice.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot modify items in invoice with status ${invoiceItem.invoice.status}` 
      }, { status: 400 });
    }

    // Remove the item and recalculate invoice totals
    await prisma.$transaction(async (tx) => {
      // Delete the invoice item
      await tx.invoiceItem.delete({
        where: { id: resolvedParams.itemId }
      });

      // Recalculate invoice total
      const remainingItems = await tx.invoiceItem.findMany({
        where: { invoiceId: resolvedParams.id }
      });

      const total = remainingItems.reduce((sum, item) => sum + item.amount, 0);

      // Update invoice total
      await tx.invoice.update({
        where: { id: resolvedParams.id },
        data: {
          total,
          updatedAt: new Date()
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice item:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice item" },
      { status: 500 }
    );
  }
}