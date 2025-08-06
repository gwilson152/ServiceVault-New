import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to modify account users
    const canManage = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "update"
    });
    if (!canManageUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: accountUserId } = await params;
    const body = await request.json();
    const { accountId: targetAccountId } = body;

    if (!targetAccountId) {
      return NextResponse.json(
        { error: "Target account ID is required" },
        { status: 400 }
      );
    }

    // Get the current account user
    const accountUser = await prisma.accountUser.findUnique({
      where: { id: accountUserId },
      include: {
        account: {
          include: {
            parentAccount: true,
            childAccounts: true
          }
        }
      }
    });

    if (!accountUser) {
      return NextResponse.json(
        { error: "Account user not found" },
        { status: 404 }
      );
    }

    // Get the target account
    const targetAccount = await prisma.account.findUnique({
      where: { id: targetAccountId },
      include: {
        parentAccount: true,
        childAccounts: true
      }
    });

    if (!targetAccount) {
      return NextResponse.json(
        { error: "Target account not found" },
        { status: 404 }
      );
    }

    // Validate that the move is allowed (within same account hierarchy)
    const currentAccount = accountUser.account;
    const isValidMove = (
      // Moving to parent account
      (currentAccount.parentAccountId && currentAccount.parentAccountId === targetAccountId) ||
      // Moving to child account
      (currentAccount.childAccounts.some(child => child.id === targetAccountId)) ||
      // Moving from parent to child
      (targetAccount.parentAccountId === currentAccount.id) ||
      // Moving between sibling accounts (same parent)
      (currentAccount.parentAccountId && targetAccount.parentAccountId === currentAccount.parentAccountId)
    );

    if (!isValidMove) {
      return NextResponse.json(
        { error: "Account user can only be moved within the same account hierarchy" },
        { status: 400 }
      );
    }

    // Prevent moving to the same account
    if (currentAccount.id === targetAccountId) {
      return NextResponse.json(
        { error: "Account user is already in this account" },
        { status: 400 }
      );
    }

    // Check if a user with the same email already exists in the target account
    const existingUser = await prisma.accountUser.findFirst({
      where: {
        accountId: targetAccountId,
        email: accountUser.email
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists in the target account" },
        { status: 400 }
      );
    }

    // Perform the move
    const updatedAccountUser = await prisma.accountUser.update({
      where: { id: accountUserId },
      data: {
        accountId: targetAccountId
      },
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

    return NextResponse.json({
      message: "Account user moved successfully",
      accountUser: accountUserWithStatus
    });

  } catch (error) {
    console.error("Error moving account user:", error);
    return NextResponse.json(
      { error: "Failed to move account user" },
      { status: 500 }
    );
  }
}