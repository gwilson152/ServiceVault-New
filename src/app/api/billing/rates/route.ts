import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permissionService } from "@/lib/permissions/PermissionService";

export async function GET() {
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

    const billingRates = await prisma.billingRate.findMany({
      orderBy: { name: "asc" }
    });

    // Check if each rate is in use
    const billingRatesWithUsage = await Promise.all(
      billingRates.map(async (rate) => {
        const timeEntriesCount = await prisma.timeEntry.count({
          where: { billingRateId: rate.id }
        });
        return {
          ...rate,
          isUsed: timeEntriesCount > 0
        };
      })
    );

    return NextResponse.json(billingRatesWithUsage);
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
    const canCreate = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "billing",
      action: "create"
    });
    
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, rate, description, isDefault, isEnabled } = body;

    if (!name || rate === undefined || rate === null) {
      return NextResponse.json(
        { error: "Name and rate are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.billingRate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const billingRate = await prisma.billingRate.create({
      data: {
        name,
        rate: parseFloat(rate),
        description: description || null,
        isDefault: isDefault || false,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
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