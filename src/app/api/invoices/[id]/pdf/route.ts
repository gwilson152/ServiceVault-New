import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";
import jsPDF from "jspdf";

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

    // Check permission to export PDF with account context
    const canExportPDF = await permissionService.hasPermission(
      session.user.id,
      "invoices",
      "export-pdf",
      invoiceForAuth.accountId
    );

    if (!canExportPDF) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get full invoice data
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

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, x: number, y: number, options?: any) => {
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPosition = margin;
        y = yPosition;
      }
      pdf.text(text, x, y, options);
      return y;
    };

    // Header
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    yPosition = addText('INVOICE', margin, yPosition) + 10;

    // Invoice details
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    yPosition = addText(`Invoice #: ${invoice.invoiceNumber}`, margin, yPosition) + 6;
    yPosition = addText(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, margin, yPosition) + 6;
    yPosition = addText(`Status: ${invoice.status}`, margin, yPosition) + 10;

    // Account information
    pdf.setFont(undefined, 'bold');
    yPosition = addText('Bill To:', margin, yPosition) + 6;
    pdf.setFont(undefined, 'normal');
    yPosition = addText(invoice.account.name, margin, yPosition) + 15;

    // Items table header
    pdf.setFont(undefined, 'bold');
    const tableStartY = yPosition;
    yPosition = addText('Description', margin, yPosition);
    addText('Quantity', pageWidth - 120, yPosition);
    addText('Rate', pageWidth - 80, yPosition);
    addText('Amount', pageWidth - 40, yPosition);
    yPosition += 8;

    // Draw header line
    pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 4;

    // Items
    pdf.setFont(undefined, 'normal');
    invoice.items.forEach((item) => {
      if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        yPosition = margin;
        
        // Redraw table header on new page
        pdf.setFont(undefined, 'bold');
        yPosition = addText('Description', margin, yPosition);
        addText('Quantity', pageWidth - 120, yPosition);
        addText('Rate', pageWidth - 80, yPosition);
        addText('Amount', pageWidth - 40, yPosition);
        yPosition += 8;
        pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
        yPosition += 4;
        pdf.setFont(undefined, 'normal');
      }

      // Description (with word wrapping for long descriptions)
      const description = item.description || 'No description';
      const splitDescription = pdf.splitTextToSize(description, pageWidth - 200);
      
      yPosition = addText(splitDescription[0], margin, yPosition);
      addText(item.quantity.toString(), pageWidth - 120, yPosition);
      addText(`$${item.rate.toFixed(2)}`, pageWidth - 80, yPosition);
      addText(`$${item.amount.toFixed(2)}`, pageWidth - 40, yPosition);
      yPosition += 6;

      // Add additional description lines if wrapped
      if (splitDescription.length > 1) {
        for (let i = 1; i < splitDescription.length; i++) {
          yPosition = addText(splitDescription[i], margin, yPosition) + 6;
        }
      }
    });

    // Summary section
    yPosition += 10;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totals
    pdf.setFont(undefined, 'normal');
    yPosition = addText('Subtotal:', pageWidth - 80, yPosition);
    addText(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 40, yPosition);
    yPosition += 6;

    yPosition = addText('Tax:', pageWidth - 80, yPosition);
    addText(`$${invoice.tax.toFixed(2)}`, pageWidth - 40, yPosition);
    yPosition += 8;

    // Total line
    pdf.line(pageWidth - 85, yPosition - 2, pageWidth - margin, yPosition - 2);
    
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(14);
    yPosition = addText('Total:', pageWidth - 80, yPosition);
    addText(`$${invoice.total.toFixed(2)}`, pageWidth - 40, yPosition);

    // Notes section
    if (invoice.notes) {
      yPosition += 20;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      yPosition = addText('Notes:', margin, yPosition) + 6;
      pdf.setFont(undefined, 'normal');
      const splitNotes = pdf.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
      splitNotes.forEach((line: string) => {
        yPosition = addText(line, margin, yPosition) + 6;
      });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}