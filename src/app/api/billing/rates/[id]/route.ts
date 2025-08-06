import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function PATCH(
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
    const { name, rate, description, isDefault, isEnabled } = body;

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (description !== undefined) updateData.description = description || null;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    // Validate required fields if they're being updated
    if (name === "" || (rate !== undefined && (rate === null || isNaN(parseFloat(rate))))) {
      return NextResponse.json(
        { error: "Name cannot be empty and rate must be a valid number" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.billingRate.updateMany({
        where: { 
          isDefault: true,
          id: { not: resolvedParams.id }
        },
        data: { isDefault: false }
      });
    }

    const billingRate = await prisma.billingRate.update({
      where: { id: resolvedParams.id },
      data: updateData,
    });

    return NextResponse.json(billingRate);
  } catch (error) {
    console.error("Error updating billing rate:", error);
    return NextResponse.json(
      { error: "Failed to update billing rate" },
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

    // Check if billing rate is in use
    const timeEntriesWithRate = await prisma.timeEntry.count({
      where: { billingRateId: resolvedParams.id }
    });

    if (timeEntriesWithRate > 0) {
      return NextResponse.json(
        { error: "Cannot delete billing rate. It is currently in use by existing time entries. You can disable it instead." },
        { status: 400 }
      );
    }

    await prisma.billingRate.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing rate:", error);
    return NextResponse.json(
      { error: "Failed to delete billing rate" },
      { status: 500 }
    );
  }
}