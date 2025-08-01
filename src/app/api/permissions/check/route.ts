import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, PermissionCheck } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permission: PermissionCheck = await request.json();

    // Validate permission structure
    if (!permission.resource || !permission.action) {
      return NextResponse.json(
        { error: "Invalid permission format. Resource and action are required." },
        { status: 400 }
      );
    }

    const result = await hasPermission(session.user.id, permission);

    return NextResponse.json({ hasPermission: result });
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { error: "Failed to check permission" },
      { status: 500 }
    );
  }
}