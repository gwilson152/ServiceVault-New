import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view billing rates
    const canViewBilling = await hasPermission(session.user.id, { resource: "billing", action: "view" });
    if (!canViewBilling) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const billingRates = await prisma.billingRate.findMany({
      orderBy: { name: "asc" }
    });

    return NextResponse.json(billingRates);
  } catch (error) {
    console.error("Error fetching billing rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create billing rates
    const canCreateBilling = await hasPermission(session.user.id, { resource: "billing", action: "create" });
    if (!canCreateBilling) {
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

    const billingRate = await prisma.billingRate.create({
      data: {
        name,
        rate: parseFloat(hourlyRate),
        description: description || null,
      },
    });

    return NextResponse.json(billingRate, { status: 201 });
  } catch (error) {
    console.error("Error creating billing rate:", error);
    return NextResponse.json(
      { error: "Failed to create billing rate" },
      { status: 500 }
    );
  }
}