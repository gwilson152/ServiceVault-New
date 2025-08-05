import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from '@/lib/permissions/PermissionService';

/**
 * GET /api/auth/permissions
 * 
 * Fetch comprehensive user permissions for the current session
 * Uses the optimized PermissionService with caching
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use the optimized permission service
    const permissions = await permissionService.getUserPermissions(session.user.id);
    
    // Convert Map and Set objects to serializable format
    const serializedPermissions = {
      isSuperAdmin: permissions.isSuperAdmin,
      systemPermissions: Array.from(permissions.systemPermissions),
      accountPermissions: Object.fromEntries(
        Array.from(permissions.accountPermissions.entries()).map(([accountId, perms]) => [
          accountId,
          Array.from(perms)
        ])
      )
    };

    return NextResponse.json(serializedPermissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}