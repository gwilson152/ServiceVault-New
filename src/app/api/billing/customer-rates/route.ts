import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to view billing rates
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "view"
    });
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const accountRates = await prisma.accountBillingRate.findMany({
      where: { accountId },
      include: { billingRate: true },
      orderBy: { billingRate: { name: "asc" } }
    });

    return NextResponse.json(accountRates);
  } catch (error) {
    console.error("Error fetching account billing rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch account billing rates" },
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
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "create"
    });
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { accountId, billingRateId, rate } = body;

    if (!accountId || !billingRateId || !rate) {
      return NextResponse.json(
        { error: "Account ID, billing rate ID, and rate are required" },
        { status: 400 }
      );
    }

    const accountRate = await prisma.accountBillingRate.create({
      data: {
        accountId,
        billingRateId,
        rate: parseFloat(rate),
      },
      include: { billingRate: true },
    });

    return NextResponse.json(accountRate, { status: 201 });
  } catch (error) {
    console.error("Error creating account billing rate:", error);
    return NextResponse.json(
      { error: "Failed to create account billing rate" },
      { status: 500 }
    );
  }
}