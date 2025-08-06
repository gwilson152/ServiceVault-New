import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { permissionService } from "@/lib/permissions/PermissionService";
import { 
  assignUserByDomain, 
  batchAssignUsersByDomain, 
  findUnassignedDomainUsers 
} from "@/lib/users/domainAssignmentService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view and manage users
    const canManageUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "manage"
    });

    if (!canManageUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "find-unassigned") {
      // Find users that could be assigned by domain but aren't yet
      const unassignedUsers = await findUnassignedDomainUsers();
      
      return NextResponse.json({
        unassignedUsers,
        message: `Found ${unassignedUsers.length} users that could be auto-assigned by domain`
      });
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });

  } catch (error) {
    console.error("Error in domain assignment GET:", error);
    return NextResponse.json(
      { error: "Failed to process domain assignment request" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to manage users
    const canManageUsers = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "users",
      action: "manage"
    });

    if (!canManageUsers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, email, userEmails } = body;

    if (action === "assign-single") {
      // Assign single user by domain
      if (!userId || !email) {
        return NextResponse.json(
          { error: "userId and email are required" },
          { status: 400 }
        );
      }

      const result = await assignUserByDomain(userId, email);
      
      return NextResponse.json({
        result,
        message: result.assigned 
          ? `User successfully assigned to ${result.accountName}`
          : result.message
      });

    } else if (action === "assign-batch") {
      // Batch assign multiple users by domain
      if (!userEmails || !Array.isArray(userEmails)) {
        return NextResponse.json(
          { error: "userEmails array is required" },
          { status: 400 }
        );
      }

      const results = await batchAssignUsersByDomain(userEmails);
      const successCount = results.filter(r => r.assigned).length;
      
      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          assigned: successCount,
          skipped: results.length - successCount
        },
        message: `Processed ${results.length} users, ${successCount} assigned successfully`
      });

    } else if (action === "assign-all-unassigned") {
      // Find and assign all unassigned users with matching domains
      const unassignedUsers = await findUnassignedDomainUsers();
      
      if (unassignedUsers.length === 0) {
        return NextResponse.json({
          message: "No unassigned users found with matching domains"
        });
      }

      const userEmails = unassignedUsers.map(u => ({
        userId: u.userId,
        email: u.email
      }));

      const results = await batchAssignUsersByDomain(userEmails);
      const successCount = results.filter(r => r.assigned).length;
      
      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          assigned: successCount,
          skipped: results.length - successCount
        },
        message: `Auto-assigned ${successCount} out of ${results.length} users by domain`
      });

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error in domain assignment POST:", error);
    return NextResponse.json(
      { error: "Failed to process domain assignment" },
      { status: 500 }
    );
  }
}