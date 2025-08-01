import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// ABAC permission check for time entry editing
async function checkTimeEntryEditPermission(user: { id: string; role: string }, timeEntry: { userId: string }): Promise<boolean> {
  // Check base permission to update time entries
  const canUpdateTimeEntries = await hasPermission(user.id, { resource: "time-entries", action: "update" });
  if (!canUpdateTimeEntries) {
    return false;
  }

  // Creator can always edit their own time entries if they have the permission
  if (timeEntry.userId === user.id) {
    return true;
  }

  // For additional business logic (like managers editing subordinate entries), 
  // we could check if user has update permission with "account" scope
  const canUpdateAccountTimeEntries = await hasPermission(user.id, { 
    resource: "time-entries", 
    action: "update", 
    scope: "account" 
  });
  
  return canUpdateAccountTimeEntries;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { 
            id: true, 
            title: true,
            account: {
              select: { id: true, name: true }
            }
          }
        },
        account: {
          select: { id: true, name: true }
        },
        billingRate: {
          select: { id: true, name: true, rate: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
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

    if (!timeEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check permission to view time entries
    const canViewTimeEntries = await hasPermission(session.user.id, { resource: "time-entries", action: "view" });
    if (!canViewTimeEntries) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Additional scope-based access check
    const isOwner = timeEntry.userId === session.user.id;
    const canViewAccountTimeEntries = await hasPermission(session.user.id, { 
      resource: "time-entries", 
      action: "view", 
      scope: "account" 
    });

    if (!isOwner && !canViewAccountTimeEntries) {
      // For account users, check if they have access to the related account
      const userAccounts = await prisma.accountUser.findMany({
        where: { userId: session.user.id },
        select: { accountId: true }
      });
      const accountIds = userAccounts.map(ua => ua.accountId);
      
      const hasAccountAccess = (
        (timeEntry.accountId && accountIds.includes(timeEntry.accountId)) ||
        (timeEntry.ticket?.account && accountIds.includes(timeEntry.ticket.account.id))
      );

      if (!hasAccountAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(timeEntry);

  } catch (error) {
    console.error('Error fetching time entry:', error);
    return NextResponse.json(
      { error: "Failed to fetch time entry" },
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true }
            }
          }
        }
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check if time entry is associated with any invoice (draft or finalized)
    const isInvoiced = existingEntry.invoiceItems && existingEntry.invoiceItems.length > 0;
    if (isInvoiced) {
      const invoice = existingEntry.invoiceItems[0]?.invoice;
      const invoiceNumber = invoice?.invoiceNumber || invoice?.id || 'unknown';
      return NextResponse.json({ 
        error: `Cannot modify time entry - already included in invoice #${invoiceNumber}` 
      }, { status: 403 });
    }

    // Enhanced ABAC permissions for time entry editing
    const canEdit = await checkTimeEntryEditPermission(session.user, existingEntry);
    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, accountId, minutes, hours, description, date, time, noCharge, billingRateId, action } = body;

    // Handle approval actions
    if (action === 'approve' || action === 'reject') {
      // Check approval permissions
      const canApprove = await hasPermission(session.user.id, PERMISSIONS.TIME_ENTRIES.APPROVE);
      if (!canApprove) {
        return NextResponse.json({ error: "Access denied - approval permission required" }, { status: 403 });
      }

      // Additional check: cannot unapprove entries that are already invoiced
      if (action === 'reject' && isInvoiced) {
        const invoice = existingEntry.invoiceItems[0]?.invoice;
        const invoiceNumber = invoice?.invoiceNumber || invoice?.id || 'unknown';
        return NextResponse.json({ 
          error: `Cannot unapprove time entry - already included in invoice #${invoiceNumber}` 
        }, { status: 403 });
      }

      const approvalData: Record<string, unknown> = {
        isApproved: action === 'approve',
        approvedBy: session.user.id,
        approvedAt: new Date()
      };

      // Rate locking: When approving, lock the current billing rate values
      if (action === 'approve' && existingEntry.billingRateId && !existingEntry.billingRateName) {
        const billingRate = await prisma.billingRate.findUnique({
          where: { id: existingEntry.billingRateId }
        });
        
        if (billingRate) {
          approvalData.billingRateName = billingRate.name;
          approvalData.billingRateValue = billingRate.rate;
        }
      }

      const timeEntry = await prisma.timeEntry.update({
        where: { id },
        data: approvalData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          ticket: {
            select: { 
              id: true, 
              title: true,
              account: {
                select: { id: true, name: true }
              }
            }
          },
          account: {
            select: { id: true, name: true }
          },
          billingRate: {
            select: { id: true, name: true, rate: true }
          },
          approver: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return NextResponse.json(timeEntry);
    }

    // Validation for regular updates
    // Handle backward compatibility: convert hours to minutes if provided
    let timeInMinutes: number | undefined;
    if (minutes !== undefined) {
      timeInMinutes = parseInt(minutes.toString());
    } else if (hours !== undefined) {
      timeInMinutes = Math.round(parseFloat(hours.toString()) * 60);
    }
    
    if (timeInMinutes !== undefined && timeInMinutes <= 0) {
      return NextResponse.json({ error: "Time must be greater than 0 minutes" }, { status: 400 });
    }

    if (description !== undefined && description.trim().length === 0) {
      return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 });
    }

    // If changing ticket/account association, validate the new values
    if (ticketId !== undefined || accountId !== undefined) {
      if ((!ticketId && !accountId) || (ticketId && accountId)) {
        return NextResponse.json({ 
          error: "Time entry must be associated with either a ticket or an account, but not both" 
        }, { status: 400 });
      }

      // Verify ticket exists (if provided)
      if (ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId }
        });
        if (!ticket) {
          return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }
      }

      // Verify account exists (if provided)
      if (accountId) {
        const account = await prisma.account.findUnique({
          where: { id: accountId }
        });
        if (!account) {
          return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }
      }
    }

    // Update time entry
    const updateData: Record<string, unknown> = {};
    if (ticketId !== undefined) updateData.ticketId = ticketId;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (timeInMinutes !== undefined) updateData.minutes = timeInMinutes;
    if (description !== undefined) updateData.description = description.trim();
    if (date !== undefined) {
      updateData.date = date && time ? new Date(`${date}T${time}:00`) : new Date(date);
    }
    if (noCharge !== undefined) updateData.noCharge = Boolean(noCharge);

    // Get billing rate details if being updated
    if (billingRateId !== undefined) {
      if (billingRateId) {
        const billingRate = await prisma.billingRate.findUnique({
          where: { id: billingRateId }
        });
        
        if (billingRate) {
          updateData.billingRateId = billingRateId;
          updateData.billingRateName = billingRate.name;
          updateData.billingRateValue = billingRate.rate;
        } else {
          return NextResponse.json({ error: "Billing rate not found" }, { status: 404 });
        }
      } else {
        // Clear billing rate
        updateData.billingRateId = null;
        updateData.billingRateName = null;
        updateData.billingRateValue = null;
      }
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { 
            id: true, 
            title: true,
            account: {
              select: { id: true, name: true }
            }
          }
        },
        account: {
          select: { id: true, name: true }
        },
        billingRate: {
          select: { id: true, name: true, rate: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
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

    return NextResponse.json(timeEntry);

  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true, status: true }
            }
          }
        }
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Check if time entry is associated with any invoice (cannot delete if invoiced)
    const isInvoiced = existingEntry.invoiceItems && existingEntry.invoiceItems.length > 0;
    if (isInvoiced) {
      const invoice = existingEntry.invoiceItems[0]?.invoice;
      const invoiceNumber = invoice?.invoiceNumber || invoice?.id || 'unknown';
      return NextResponse.json({ 
        error: `Cannot delete time entry - already included in invoice #${invoiceNumber}` 
      }, { status: 403 });
    }

    // Enhanced ABAC permissions for time entry deletion
    const canDelete = await checkTimeEntryEditPermission(session.user, existingEntry);
    if (!canDelete) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.timeEntry.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Time entry deleted successfully" });

  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}