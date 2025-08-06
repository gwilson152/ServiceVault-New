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
    const { name, rate, description, isDefault } = body;

    if (!name || rate === undefined || rate === null) {
      return NextResponse.json(
        { error: "Name and rate are required" },
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
      data: {
        name,
        rate: parseFloat(rate),
        description: description || null,
        isDefault: isDefault || false,
      },
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