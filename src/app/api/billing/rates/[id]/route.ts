import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to update billing rates
    const canUpdateBilling = await hasPermission(session.user.id, { resource: "billing", action: "update" });
    if (!canUpdateBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, hourlyRate, description } = body;

    if (!name || !hourlyRate) {
      return NextResponse.json(
        { error: "Name and hourly rate are required" },
        { status: 400 }
      );
    }

    const billingRate = await prisma.billingRate.update({
      where: { id: params.id },
      data: {
        name,
        hourlyRate: parseFloat(hourlyRate),
        description: description || null,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to delete billing rates
    const canDeleteBilling = await hasPermission(session.user.id, { resource: "billing", action: "delete" });
    if (!canDeleteBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.billingRate.delete({
      where: { id: params.id },
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