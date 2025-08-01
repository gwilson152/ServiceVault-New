import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { settingsService } from "@/lib/settings";
import { SettingsCategory } from "@/types/settings";

// GET /api/settings - Get all settings or by category
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can access settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SettingsCategory | null;

    if (category) {
      // Get settings for specific category
      const settings = await settingsService.getByCategory(category);
      return NextResponse.json({ settings, category });
    } else {
      // Get all settings organized by category
      const settingsByCategory = await settingsService.getSettingsByCategory();
      return NextResponse.json({ settingsByCategory });
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// POST /api/settings - Set multiple settings
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can modify settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ 
        error: "Invalid request body. Expected 'settings' object." 
      }, { status: 400 });
    }

    await settingsService.setMany(settings);

    return NextResponse.json({ 
      success: true,
      message: "Settings updated successfully",
      count: Object.keys(settings).length
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ 
      error: "Failed to update settings" 
    }, { status: 500 });
  }
}

// PUT /api/settings - Same as POST for convenience
export async function PUT(request: Request) {
  return POST(request);
}