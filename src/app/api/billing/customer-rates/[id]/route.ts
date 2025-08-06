import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to update billing rates
    const canUpdate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "update"
    });
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rate } = body;

    if (!rate) {
      return NextResponse.json(
        { error: "Rate is required" },
        { status: 400 }
      );
    }

    const accountRate = await prisma.accountBillingRate.update({
      where: { id: resolvedParams.id },
      data: {
        rate: parseFloat(rate),
      },
      include: { billingRate: true },
    });

    return NextResponse.json(accountRate);
  } catch (error) {
    console.error("Error updating account billing rate:", error);
    return NextResponse.json(
      { error: "Failed to update account billing rate" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to delete billing rates
    const canDelete = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "delete"
    });
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.accountBillingRate.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account billing rate:", error);
    return NextResponse.json(
      { error: "Failed to delete account billing rate" },
      { status: 500 }
    );
  }
}