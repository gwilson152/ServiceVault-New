import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { permissionService } from "@/lib/permissions/PermissionService";
import { settingsService } from "@/lib/settings";

interface RouteParams {
  params: Promise<{
    key: string;
  }>;
}

// GET /api/settings/[key] - Get a specific setting
export async function GET(request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view settings
    const hasPermission = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'settings',
      action: 'view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = resolvedParams;
    
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
    console.error(`Error fetching setting:`, error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// PUT /api/settings/[key] - Set a specific setting
export async function PUT(request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to update settings
    const hasPermission = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'settings',
      action: 'update'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = resolvedParams;
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
    console.error(`Error updating setting:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update setting" 
    }, { status: 500 });
  }
}

// DELETE /api/settings/[key] - Delete a specific setting
export async function DELETE(request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete settings
    const hasPermission = await permissionService.hasPermission({
      userId: session.user.id,
      resource: 'settings',
      action: 'delete'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key } = resolvedParams;
    
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
    console.error(`Error deleting setting:`, error);
    return NextResponse.json({ 
      error: "Failed to delete setting" 
    }, { status: 500 });
  }
}