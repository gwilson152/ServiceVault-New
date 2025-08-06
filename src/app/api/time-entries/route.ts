import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";
import { applyPermissionFilter } from "@/lib/permissions/withPermissions";
import { createBillingRateSnapshot, getDefaultBillingRate } from "@/lib/billing/billingRateService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check view permission using new service
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'view'
    });

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const ticketId = searchParams.get('ticketId');
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const billable = searchParams.get('billable');

    // Build base query
    let query: any = {
      skip: (page - 1) * limit,
      take: limit,
      where: {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { 
            id: true, 
            ticketNumber: true,
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
    };

    // Apply filters
    if (ticketId) {
      query.where.ticketId = ticketId;
    }
    if (accountId) {
      query.where.accountId = accountId;
    }
    if (userId) {
      query.where.userId = userId;
    }
    if (startDate) {
      query.where.date = { ...query.where.date, gte: new Date(startDate) };
    }
    if (endDate) {
      query.where.date = { ...query.where.date, lte: new Date(endDate) };
    }
    if (billable !== null && billable !== undefined) {
      query.where.noCharge = billable === 'true' ? false : true;
    }

    // Apply permission filtering
    const filteredQuery = await applyPermissionFilter(
      session.user.id,
      'time-entries',
      query
    );

    // Execute queries
    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany(filteredQuery),
      prisma.timeEntry.count({ where: filteredQuery.where })
    ]);

    return NextResponse.json({
      timeEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check create permission
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'create'
    });

    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, accountId, minutes, hours, description, date, time, noCharge, timerId } = body;
    let { billingRateId } = body;

    // Handle backward compatibility: if hours is provided, convert to minutes
    let timeInMinutes: number;
    if (minutes !== undefined) {
      timeInMinutes = parseInt(minutes.toString());
    } else if (hours !== undefined) {
      // Convert hours to minutes for backward compatibility
      timeInMinutes = Math.round(parseFloat(hours.toString()) * 60);
    } else {
      return NextResponse.json({ error: "Either minutes or hours must be provided" }, { status: 400 });
    }

    // Validation
    if (!timeInMinutes || timeInMinutes <= 0) {
      return NextResponse.json({ error: "Time must be greater than 0 minutes" }, { status: 400 });
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Must have either ticketId or accountId, but not both
    if ((!ticketId && !accountId) || (ticketId && accountId)) {
      return NextResponse.json({ 
        error: "Time entry must be associated with either a ticket or an account, but not both" 
      }, { status: 400 });
    }

    // Verify ticket exists and user has access (if ticketId provided)
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { account: true }
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      // Check if user has access to create time entries for this ticket's account
      const canCreateForAccount = await permissionService.hasPermission({
        userId: session.user.id,
        resource: 'time-entries',
        action: 'create',
        accountId: ticket.accountId
      });

      if (!canCreateForAccount) {
        return NextResponse.json({ error: "Access denied to this ticket's account" }, { status: 403 });
      }
    }

    // Verify account exists and user has access (if accountId provided)
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      // Check if user has access to create time entries for this account
      const canCreateForAccount = await permissionService.hasPermission({
        userId: session.user.id,
        resource: 'time-entries',
        action: 'create',
        accountId: accountId
      });

      if (!canCreateForAccount) {
        return NextResponse.json({ error: "Access denied to this account" }, { status: 403 });
      }
    }

    // Determine target account ID for billing rate lookup
    let targetAccountId = accountId;
    if (ticketId && !accountId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { accountId: true }
      });
      targetAccountId = ticket?.accountId;
    }

    // Get effective billing rate with account overrides and parent inheritance
    let billingRateName = null;
    let billingRateValue = null;
    
    if (billingRateId && targetAccountId) {
      // Use billing rate service to get effective rate (including parent inheritance)
      const rateSnapshot = await createBillingRateSnapshot(targetAccountId, billingRateId);
      if (rateSnapshot) {
        billingRateName = rateSnapshot.billingRateName;
        billingRateValue = rateSnapshot.billingRateValue;
      }
    } else if (billingRateId) {
      // Fallback to system rate if no account context
      const billingRate = await prisma.billingRate.findUnique({
        where: { id: billingRateId }
      });
      
      if (billingRate) {
        billingRateName = billingRate.name;
        billingRateValue = billingRate.rate;
      }
    } else if (targetAccountId && !noCharge) {
      // Auto-assign default billing rate if none specified and not no-charge
      const defaultRate = await getDefaultBillingRate(targetAccountId);
      if (defaultRate) {
        billingRateId = defaultRate.id;
        billingRateName = defaultRate.name;
        billingRateValue = defaultRate.rate;
      }
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        ticketId: ticketId || null,
        accountId: accountId || null,
        userId: session.user.id,
        minutes: timeInMinutes,
        description: description.trim(),
        date: date && time ? new Date(`${date}T${time}:00`) : date ? new Date(date) : new Date(),
        noCharge: Boolean(noCharge),
        billingRateId: billingRateId || null,
        billingRateName,
        billingRateValue
      },
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

    // If a timerId was provided, delete the timer after successful time entry creation
    if (timerId) {
      try {
        // Verify the timer belongs to the current user before deleting
        const timer = await prisma.timer.findUnique({
          where: { id: timerId }
        });
        
        if (timer && timer.userId === session.user.id) {
          await prisma.timer.delete({
            where: { id: timerId }
          });
        }
      } catch (timerError) {
        // Log error but don't fail the time entry creation
        console.error('Error deleting timer after time entry creation:', timerError);
      }
    }

    return NextResponse.json(timeEntry, { status: 201 });

  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, minutes, hours, description, date, time, noCharge, billingRateId, approvedById } = body;

    if (!id) {
      return NextResponse.json({ error: "Time entry ID is required" }, { status: 400 });
    }

    // Handle backward compatibility: if hours is provided, convert to minutes
    let timeInMinutes: number | undefined;
    if (minutes !== undefined) {
      timeInMinutes = parseInt(minutes.toString());
    } else if (hours !== undefined) {
      timeInMinutes = Math.round(parseFloat(hours.toString()) * 60);
    }

    // Get existing time entry to check permissions
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { 
        ticket: { include: { account: true } },
        account: true
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Determine account ID from ticket or direct account
    const accountId = existingEntry.ticketId 
      ? existingEntry.ticket?.accountId 
      : existingEntry.accountId;

    // Check update permission for the account
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'update',
      accountId: accountId || undefined
    });

    if (!canUpdate) {
      // Check if user owns the entry and has basic update permission
      if (existingEntry.userId === session.user.id) {
        const canUpdateOwn = await permissionService.hasPermission({
          userId: session.user.id,
          resource: 'time-entries',
          action: 'update-own'
        });
        
        if (!canUpdateOwn) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check approval permission if approving
    if (approvedById !== undefined) {
      const canApprove = await permissionService.hasPermission({
        userId: session.user.id,
        resource: 'time-entries',
        action: 'approve',
        accountId: accountId || undefined
      });

      if (!canApprove) {
        return NextResponse.json({ error: "No permission to approve time entries" }, { status: 403 });
      }
    }

    // Get billing rate details if provided
    let billingRateName = existingEntry.billingRateName;
    let billingRateValue = existingEntry.billingRateValue;
    
    if (billingRateId !== undefined) {
      if (billingRateId) {
        const billingRate = await prisma.billingRate.findUnique({
          where: { id: billingRateId }
        });
        
        if (billingRate) {
          billingRateName = billingRate.name;
          billingRateValue = billingRate.rate;
        }
      } else {
        // Explicitly clearing billing rate
        billingRateName = null;
        billingRateValue = null;
      }
    }

    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(timeInMinutes !== undefined && { minutes: timeInMinutes }),
        ...(description !== undefined && { description: description.trim() }),
        ...(date !== undefined && { 
          date: date && time ? new Date(`${date}T${time}:00`) : date ? new Date(date) : undefined 
        }),
        ...(noCharge !== undefined && { noCharge: Boolean(noCharge) }),
        ...(billingRateId !== undefined && { 
          billingRateId: billingRateId || null,
          billingRateName,
          billingRateValue
        }),
        ...(approvedById !== undefined && { 
          approvedById: approvedById || null,
          approvedAt: approvedById ? new Date() : null
        })
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        ticket: {
          select: { 
            id: true, 
            ticketNumber: true,
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

    return NextResponse.json(updatedEntry);

  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Time entry ID is required" }, { status: 400 });
    }

    // Get existing time entry to check permissions
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: { 
        ticket: { include: { account: true } },
        account: true,
        invoiceItems: true
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    // Prevent deletion if already invoiced
    if (existingEntry.invoiceItems.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete time entry that has been invoiced" 
      }, { status: 400 });
    }

    // Determine account ID from ticket or direct account
    const accountId = existingEntry.ticketId 
      ? existingEntry.ticket?.accountId 
      : existingEntry.accountId;

    // Check delete permission for the account
    const canDelete = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'time-entries',
      action: 'delete',
      accountId: accountId || undefined
    });

    if (!canDelete) {
      // Check if user owns the entry and has basic delete permission
      if (existingEntry.userId === session.user.id) {
        const canDeleteOwn = await permissionService.hasPermission({
          userId: session.user.id,
          resource: 'time-entries',
          action: 'delete-own'
        });
        
        if (!canDeleteOwn) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        
        // Additional check: users can only delete their own unapproved entries
        if (existingEntry.approvedById) {
          return NextResponse.json({ 
            error: "Cannot delete approved time entries" 
          }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete the time entry
    await prisma.timeEntry.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}