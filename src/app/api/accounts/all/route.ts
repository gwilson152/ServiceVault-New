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

    // Check permission to view accounts
    const canView = await permissionService.hasPermission({
      userId: session.user.id,
      resource: "accounts",
      action: "view"
    });
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        accountType: true,
        companyName: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}