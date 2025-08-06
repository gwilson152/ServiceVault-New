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
      select: { id: true, accountId: true, creatorId: true }
    });

    if (!invoiceForAuth) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check permission to view this invoice with account context
    const canViewInvoice = await permissionService.hasPermission(
      session.user.id,
      "invoices",
      "view",
      invoiceForAuth.accountId
    );

    if (!canViewInvoice) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
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
        creator: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check permission to update this invoice with account context
    const canUpdateInvoice = await permissionService.hasPermission(
      session.user.id,
      "invoices",
      "update",
      invoiceForAuth.accountId
    );

    if (!canUpdateInvoice) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, description, notes, issueDate, dueDate } = body;

    // For date updates, check specific permission
    if ((issueDate !== undefined || dueDate !== undefined)) {
      const canUpdateDates = await permissionService.hasPermission(
        session.user.id,
        "invoices",
        "update-dates",
        invoiceForAuth.accountId
      );

      if (!canUpdateDates) {
        return NextResponse.json({ 
          error: "You don't have permission to update invoice dates" 
        }, { status: 403 });
      }
    }

    // For status, description, and notes updates, check if invoice is DRAFT
    if ((status !== undefined || description !== undefined || notes !== undefined) && invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot modify invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;
    if (issueDate !== undefined) {
      updateData.issueDate = issueDate ? new Date(issueDate) : undefined;
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const invoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: updateData,
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
        creator: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check permission to delete this invoice with account context
    const canDeleteInvoice = await permissionService.hasPermission(
      session.user.id,
      "invoices",
      "delete",
      invoiceForAuth.accountId
    );

    if (!canDeleteInvoice) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deleting DRAFT invoices
    if (invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot delete invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    // Start transaction to remove invoice and disconnect related items
    await prisma.$transaction(async (tx) => {
      // Delete invoice items first
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: resolvedParams.id },
      });

      // Delete invoice
      await tx.invoice.delete({
        where: { id: resolvedParams.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}