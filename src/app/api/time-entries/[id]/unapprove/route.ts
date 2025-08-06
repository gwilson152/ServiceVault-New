import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { permissionService } from '@/lib/permissions/PermissionService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    // Get the time entry first to check permissions
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, status: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { id: true, accountId: true }
        }
      }
    });

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    // Check if entry is locked (part of an invoice)
    if (timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot unapprove time entry that is part of an invoice' 
      }, { status: 400 });
    }

    // Check if already unapproved
    if (!timeEntry.isApproved) {
      return NextResponse.json({ 
        error: 'Time entry is already pending approval' 
      }, { status: 400 });
    }

    // Check permissions - either approve permission or super admin
    const canApprove = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'approve',
      accountId: timeEntry.ticket?.accountId || timeEntry.accountId
    });

    if (!canApprove) {
      return NextResponse.json({ error: 'Insufficient permissions to unapprove time entries' }, { status: 403 });
    }

    // Update the time entry to unapproved status
    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        isApproved: false,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: {
            id: true,
            title: true,
            ticketNumber: true,
            account: {
              select: { id: true, name: true }
            }
          }
        },
        account: {
          select: { id: true, name: true }
        },
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedEntry);

  } catch (error) {
    console.error('Error unapproving time entry:', error);
    return NextResponse.json(
      { error: 'Failed to unapprove time entry' },
      { status: 500 }
    );
  }
}