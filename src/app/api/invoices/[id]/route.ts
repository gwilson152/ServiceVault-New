import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

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
    const canViewInvoice = await hasPermission(session.user.id, {
      resource: "invoices",
      action: "view",
      accountId: invoiceForAuth.accountId
    });

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
    const canUpdateInvoice = await hasPermission(session.user.id, {
      resource: "invoices",
      action: "update",
      accountId: invoiceForAuth.accountId
    });

    if (!canUpdateInvoice) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT invoices
    if (invoiceForAuth.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot modify invoice with status ${invoiceForAuth.status}` 
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, description, notes } = body;

    const invoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: {
        status: status || undefined,
        description: description !== undefined ? description : undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      },
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
    const canDeleteInvoice = await hasPermission(session.user.id, {
      resource: "invoices",
      action: "delete",
      accountId: invoiceForAuth.accountId
    });

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