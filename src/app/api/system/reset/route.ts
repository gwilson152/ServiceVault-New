import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN users can perform database reset
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { confirmationText, includeReseed } = body;

    // Safety check - require specific confirmation text
    if (confirmationText !== "RESET DATABASE") {
      return NextResponse.json({ 
        error: "Invalid confirmation text. Please type 'RESET DATABASE' exactly." 
      }, { status: 400 });
    }

    // Only allow in development environment for safety
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ 
        error: "Database reset is not allowed in production environment" 
      }, { status: 403 });
    }

    console.log("🔥 NUCLEAR RESET: Starting database reset...");

    // Step 1: Disconnect Prisma
    await prisma.$disconnect();

    // Step 2: Reset database schema
    console.log("📝 Resetting database schema...");
    try {
      await execAsync("npx prisma db push --force-reset --accept-data-loss", {
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      });
    } catch (error) {
      console.error("Error resetting database:", error);
      return NextResponse.json({ 
        error: "Failed to reset database schema" 
      }, { status: 500 });
    }

    // Step 3: Re-seed database if requested
    if (includeReseed) {
      console.log("🌱 Re-seeding database...");
      try {
        await execAsync("npx prisma db seed", {
          cwd: process.cwd(),
          timeout: 60000 // 1 minute timeout for seeding
        });
      } catch (error) {
        console.error("Error seeding database:", error);
        return NextResponse.json({ 
          error: "Database reset successful but seeding failed" 
        }, { status: 207 }); // 207 Multi-Status
      }
    }

    console.log("✅ NUCLEAR RESET: Database reset completed successfully");

    return NextResponse.json({ 
      success: true,
      message: includeReseed 
        ? "Database reset and re-seeded successfully"
        : "Database reset successfully (no seed data)"
    });

  } catch (error) {
    console.error("Nuclear reset error:", error);
    return NextResponse.json({ 
      error: "Internal server error during database reset" 
    }, { status: 500 });
  }
}