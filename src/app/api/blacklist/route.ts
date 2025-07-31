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

    // Only admins can view blacklist
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const blacklistEntries = await prisma.blacklist.findMany({
      include: {
        blocker: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(blacklistEntries);
  } catch (error) {
    console.error("Error fetching blacklist entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch blacklist entries" },
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

    // Only admins can add to blacklist
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, ipAddress, reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    if (!email && !ipAddress) {
      return NextResponse.json(
        { error: "Either email or IP address must be provided" },
        { status: 400 }
      );
    }

    // Check if entry already exists
    const existingEntry = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { ipAddress: ipAddress || undefined },
        ],
        isActive: true,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "Entry already exists in blacklist" },
        { status: 400 }
      );
    }

    const blacklistEntry = await prisma.blacklist.create({
      data: {
        email: email || null,
        ipAddress: ipAddress || null,
        reason,
        blockedBy: session.user.id,
      },
      include: {
        blocker: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    });

    return NextResponse.json(blacklistEntry);
  } catch (error) {
    console.error("Error creating blacklist entry:", error);
    return NextResponse.json(
      { error: "Failed to create blacklist entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can remove from blacklist
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Blacklist entry ID is required" },
        { status: 400 }
      );
    }

    const blacklistEntry = await prisma.blacklist.findUnique({
      where: { id },
    });

    if (!blacklistEntry) {
      return NextResponse.json(
        { error: "Blacklist entry not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.blacklist.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Blacklist entry removed successfully" });
  } catch (error) {
    console.error("Error removing blacklist entry:", error);
    return NextResponse.json(
      { error: "Failed to remove blacklist entry" },
      { status: 500 }
    );
  }
}