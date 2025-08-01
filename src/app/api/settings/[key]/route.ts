import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { settingsService } from "@/lib/settings";

interface RouteParams {
  params: {
    key: string;
  };
}

// GET /api/settings/[key] - Get a specific setting
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can access settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = params;
    
    if (!key) {
      return NextResponse.json({ 
        error: "Setting key is required" 
      }, { status: 400 });
    }

    const value = await settingsService.get(key);

    return NextResponse.json({ 
      key,
      value,
      exists: value !== null && value !== undefined
    });
  } catch (error) {
    console.error(`Error fetching setting ${params.key}:`, error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// PUT /api/settings/[key] - Set a specific setting
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can modify settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = params;
    const body = await request.json();
    const { value, description } = body;

    if (!key) {
      return NextResponse.json({ 
        error: "Setting key is required" 
      }, { status: 400 });
    }

    if (value === undefined) {
      return NextResponse.json({ 
        error: "Setting value is required" 
      }, { status: 400 });
    }

    await settingsService.set(key, value, description);

    return NextResponse.json({ 
      success: true,
      message: `Setting '${key}' updated successfully`,
      key,
      value
    });
  } catch (error) {
    console.error(`Error updating setting ${params.key}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update setting" 
    }, { status: 500 });
  }
}

// DELETE /api/settings/[key] - Delete a specific setting
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin users can delete settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = params;
    
    if (!key) {
      return NextResponse.json({ 
        error: "Setting key is required" 
      }, { status: 400 });
    }

    await settingsService.delete(key);

    return NextResponse.json({ 
      success: true,
      message: `Setting '${key}' deleted successfully`,
      key
    });
  } catch (error) {
    console.error(`Error deleting setting ${params.key}:`, error);
    return NextResponse.json({ 
      error: "Failed to delete setting" 
    }, { status: 500 });
  }
}