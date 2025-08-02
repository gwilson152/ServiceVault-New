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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to view users
    const canViewUsers = await hasPermission(session.user.id, { resource: "users", action: "view" });
    if (!canViewUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accountUser = await prisma.accountUser.findUnique({
      where: { id: resolvedParams.id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    if (!accountUser) {
      return NextResponse.json({ error: "Account user not found" }, { status: 404 });
    }

    // Add computed status information
    const accountUserWithStatus = {
      ...accountUser,
      hasLogin: !!accountUser.user,
      canBeAssigned: accountUser.isActive,
      invitationStatus: accountUser.user ? 'activated' : 
                       accountUser.invitationToken ? 'pending' : 'none'
    };

    return NextResponse.json(accountUserWithStatus);
  } catch (error) {
    console.error("Error fetching account user:", error);
    return NextResponse.json(
      { error: "Failed to fetch account user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to update users
    const canUpdateUsers = await hasPermission(session.user.id, { resource: "users", action: "update" });
    if (!canUpdateUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, isActive, permissions } = body;

    // Get existing account user to validate account context
    const existingAccountUser = await prisma.accountUser.findUnique({
      where: { id: resolvedParams.id },
      include: { account: true }
    });

    if (!existingAccountUser) {
      return NextResponse.json({ error: "Account user not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = permissions;

    // If email is being updated, check for duplicates
    if (email && email !== existingAccountUser.email) {
      const existingUser = await prisma.accountUser.findFirst({
        where: {
          email: email,
          accountId: existingAccountUser.accountId,
          id: { not: resolvedParams.id }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "An account user with this email already exists for this account" },
          { status: 400 }
        );
      }
    }

    const updatedAccountUser = await prisma.accountUser.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    // Add computed status information
    const accountUserWithStatus = {
      ...updatedAccountUser,
      hasLogin: !!updatedAccountUser.user,
      canBeAssigned: updatedAccountUser.isActive,
      invitationStatus: updatedAccountUser.user ? 'activated' : 
                       updatedAccountUser.invitationToken ? 'pending' : 'none'
    };

    return NextResponse.json(accountUserWithStatus);
  } catch (error) {
    console.error("Error updating account user:", error);
    return NextResponse.json(
      { error: "Failed to update account user" },
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Check permission to delete users
    const canDeleteUsers = await hasPermission(session.user.id, { resource: "users", action: "delete" });
    if (!canDeleteUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get account user with related data to check for dependencies
    const accountUser = await prisma.accountUser.findUnique({
      where: { id: resolvedParams.id },
      include: {
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
          }
        },
        user: true
      }
    });

    if (!accountUser) {
      return NextResponse.json({ error: "Account user not found" }, { status: 404 });
    }

    // Check if user has associated tickets or other dependencies
    const hasTickets = accountUser._count.createdTickets > 0 || accountUser._count.assignedTickets > 0;
    
    if (hasTickets) {
      return NextResponse.json(
        { error: "Cannot delete account user with associated tickets. Please reassign or close tickets first." },
        { status: 400 }
      );
    }

    // Start transaction to safely remove account user and associated user if needed
    await prisma.$transaction(async (tx) => {
      // Delete the account user
      await tx.accountUser.delete({
        where: { id: resolvedParams.id }
      });

      // If there's an associated user account and it's only linked to this account user,
      // also delete the user account
      if (accountUser.user) {
        const otherAccountUsers = await tx.accountUser.findMany({
          where: {
            user: { id: accountUser.user.id },
            id: { not: resolvedParams.id }
          }
        });

        // If this was the only account user for this user, delete the user account too
        if (otherAccountUsers.length === 0) {
          await tx.user.delete({
            where: { id: accountUser.user.id }
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account user:", error);
    return NextResponse.json(
      { error: "Failed to delete account user" },
      { status: 500 }
    );
  }
}