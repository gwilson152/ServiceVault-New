import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS_REGISTRY } from "@/lib/permissions-registry";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can seed permissions
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { force = false } = body;

    // Get current permissions in database
    const existingPermissions = await prisma.permission.findMany({
      select: { name: true }
    });
    const existingNames = new Set(existingPermissions.map(p => p.name));

    // Get all permissions from registry
    const registryPermissions = Object.values(PERMISSIONS_REGISTRY)
      .flatMap(category => Object.values(category));

    const results = {
      total: registryPermissions.length,
      existing: 0,
      created: 0,
      updated: 0,
      errors: 0,
      details: [] as Array<{
        name: string;
        action: "created" | "updated" | "skipped" | "error";
        error?: string;
      }>
    };

    for (const permission of registryPermissions) {
      const permissionName = `${permission.resource}:${permission.action}`;
      
      try {
        if (existingNames.has(permissionName)) {
          if (force) {
            // Update existing permission
            await prisma.permission.update({
              where: { name: permissionName },
              data: {
                description: permission.description || `${permission.action} ${permission.resource}`,
                resource: permission.resource,
                action: permission.action
              }
            });
            results.updated++;
            results.details.push({
              name: permissionName,
              action: "updated"
            });
          } else {
            // Skip existing permission
            results.existing++;
            results.details.push({
              name: permissionName,
              action: "skipped"
            });
          }
        } else {
          // Create new permission
          await prisma.permission.create({
            data: {
              name: permissionName,
              description: permission.description || `${permission.action} ${permission.resource}`,
              resource: permission.resource,
              action: permission.action
            }
          });
          results.created++;
          results.details.push({
            name: permissionName,
            action: "created"
          });
        }
      } catch (error) {
        console.error(`Failed to process permission: ${permissionName}`, error);
        results.errors++;
        results.details.push({
          name: permissionName,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeding completed. Created: ${results.created}, Updated: ${results.updated}, Existing: ${results.existing}, Errors: ${results.errors}`,
      results
    });

  } catch (error) {
    console.error("Error seeding permissions:", error);
    return NextResponse.json(
      { error: "Failed to seed permissions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view seed status
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current permissions in database
    const existingPermissions = await prisma.permission.findMany({
      select: { name: true, resource: true, action: true }
    });
    const existingNames = new Set(existingPermissions.map(p => p.name));

    // Get all permissions from registry
    const registryPermissions = Object.values(PERMISSIONS_REGISTRY)
      .flatMap(category => Object.values(category));

    const analysis = {
      registry: {
        total: registryPermissions.length,
        permissions: registryPermissions.map(p => ({
          name: `${p.resource}:${p.action}`,
          resource: p.resource,
          action: p.action,
          description: p.description
        }))
      },
      database: {
        total: existingPermissions.length,
        permissions: existingPermissions
      },
      comparison: {
        inRegistryOnly: [] as string[],
        inDatabaseOnly: [] as string[],
        inBoth: [] as string[]
      }
    };

    // Compare registry vs database
    const registryNames = new Set(registryPermissions.map(p => `${p.resource}:${p.action}`));
    
    for (const registryPerm of registryPermissions) {
      const name = `${registryPerm.resource}:${registryPerm.action}`;
      if (existingNames.has(name)) {
        analysis.comparison.inBoth.push(name);
      } else {
        analysis.comparison.inRegistryOnly.push(name);
      }
    }

    for (const dbPerm of existingPermissions) {
      if (!registryNames.has(dbPerm.name)) {
        analysis.comparison.inDatabaseOnly.push(dbPerm.name);
      }
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error("Error analyzing permissions:", error);
    return NextResponse.json(
      { error: "Failed to analyze permissions" },
      { status: 500 }
    );
  }
}