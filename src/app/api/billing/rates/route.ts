import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const billingRate = await prisma.billingRate.create({
      data: {
        name,
        hourlyRate: parseFloat(hourlyRate),
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