import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const customerRates = await prisma.customerBillingRate.findMany({
      where: { customerId },
      include: { billingRate: true },
      orderBy: { billingRate: { name: "asc" } }
    });

    return NextResponse.json(customerRates);
  } catch (error) {
    console.error("Error fetching customer billing rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer billing rates" },
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
    const { customerId, billingRateId, overrideRate } = body;

    if (!customerId || !billingRateId || !overrideRate) {
      return NextResponse.json(
        { error: "Customer ID, billing rate ID, and override rate are required" },
        { status: 400 }
      );
    }

    const customerRate = await prisma.customerBillingRate.create({
      data: {
        customerId,
        billingRateId,
        overrideRate: parseFloat(overrideRate),
      },
      include: { billingRate: true },
    });

    return NextResponse.json(customerRate, { status: 201 });
  } catch (error) {
    console.error("Error creating customer billing rate:", error);
    return NextResponse.json(
      { error: "Failed to create customer billing rate" },
      { status: 500 }
    );
  }
}