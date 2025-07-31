import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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