import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employees and admins can fetch account users
    if (session.user?.role === "ACCOUNT_USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accountUsers = await prisma.accountUser.findMany({
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(accountUsers);
  } catch (error) {
    console.error("Error fetching account users:", error);
    return NextResponse.json(
      { error: "Failed to fetch account users" },
      { status: 500 }
    );
  }
}