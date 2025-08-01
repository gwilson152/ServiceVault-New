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

    const { permissions }: { permissions: PermissionCheck[] } = await request.json();

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Invalid request format. Expected array of permissions." },
        { status: 400 }
      );
    }

    // Check all permissions in parallel
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      permissions.map(async (permission) => {
        if (!permission.resource || !permission.action) {
          console.warn('Invalid permission format:', permission);
          return;
        }

        const cacheKey = `${permission.resource}:${permission.action}:${permission.scope || 'default'}`;
        try {
          results[cacheKey] = await hasPermission(session.user.id, permission);
        } catch (error) {
          console.error(`Error checking permission ${cacheKey}:`, error);
          results[cacheKey] = false;
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error batch checking permissions:', error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}