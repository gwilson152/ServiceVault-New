import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { licensingService } from "@/lib/licensing";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const feature = searchParams.get("feature");

    if (!feature) {
      return NextResponse.json(
        { error: "Feature parameter is required" },
        { status: 400 }
      );
    }

    const hasAccess = await licensingService.checkFeatureAccess(feature);
    const userLimit = await licensingService.checkUserLimit();

    return NextResponse.json({
      hasAccess,
      userLimit,
    });
  } catch (error) {
    console.error("Error checking feature access:", error);
    return NextResponse.json(
      { error: "Failed to check feature access" },
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

    const body = await request.json();
    const { features } = body;

    if (!features || !Array.isArray(features)) {
      return NextResponse.json(
        { error: "Features array is required" },
        { status: 400 }
      );
    }

    const results: Record<string, boolean> = {};
    
    for (const feature of features) {
      results[feature] = await licensingService.checkFeatureAccess(feature);
    }

    const userLimit = await licensingService.checkUserLimit();

    return NextResponse.json({
      features: results,
      userLimit,
    });
  } catch (error) {
    console.error("Error checking feature access:", error);
    return NextResponse.json(
      { error: "Failed to check feature access" },
      { status: 500 }
    );
  }
}