import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { permissionService } from './PermissionService';
import { Prisma } from '@prisma/client';

export interface PermissionMiddlewareOptions {
  resource: string;
  action: string;
  accountIdField?: string; // Field name for account ID in the data model
}

/**
 * Middleware to check permissions before executing API routes
 */
export function withPermissions(options: PermissionMiddlewareOptions) {
  return async (
    handler: (req: NextRequest, context: any) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, context: any) => {
      try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // Check basic permission
        const hasPermission = await permissionService.hasPermission({
          userId: session.user.id,
          resource: options.resource,
          action: options.action
        });

        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }

        // Execute the handler with permission context
        return handler(req, {
          ...context,
          session,
          permissions: await permissionService.getUserPermissions(session.user.id)
        });
      } catch (error) {
        console.error('Permission middleware error:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Build Prisma where clause based on user permissions
 */
export async function buildPermissionFilter(
  userId: string,
  resource: string,
  accountIdField: string = 'accountId'
): Promise<Prisma.StringFilter | undefined> {
  const permissions = await permissionService.getUserPermissions(userId);
  
  // Super admin sees everything
  if (permissions.isSuperAdmin) {
    return undefined; // No filter needed
  }
  
  // Get accessible account IDs
  const accessibleAccountIds = await permissionService.getAccessibleAccountIds(userId);
  
  if (accessibleAccountIds.length === 0) {
    // User has no account access - return impossible condition
    return { equals: 'no-access-00000000' };
  }
  
  // Return filter for accessible accounts
  return { in: accessibleAccountIds };
}

/**
 * Apply permission filtering to a Prisma query
 */
export async function applyPermissionFilter<T extends Record<string, any>>(
  userId: string,
  resource: string,
  query: T,
  accountIdField: string = 'accountId'
): Promise<T> {
  const filter = await buildPermissionFilter(userId, resource, accountIdField);
  
  if (!filter) {
    return query; // No filtering needed (super admin)
  }
  
  // Apply filter to where clause
  return {
    ...query,
    where: {
      ...query.where,
      [accountIdField]: filter
    }
  };
}

/**
 * Check if user can access a specific resource
 */
export async function canAccessResource(
  userId: string,
  resource: string,
  action: string,
  resourceData: { accountId?: string; creatorId?: string }
): Promise<boolean> {
  const permissions = await permissionService.getUserPermissions(userId);
  
  // Super admin can access everything
  if (permissions.isSuperAdmin) {
    return true;
  }
  
  // Check if user has permission for this resource and action
  const hasPermission = await permissionService.hasPermission({
    userId,
    resource,
    action,
    accountId: resourceData.accountId
  });
  
  if (!hasPermission) {
    return false;
  }
  
  // Additional checks for ownership if needed
  if (resourceData.creatorId && resourceData.creatorId === userId) {
    return true; // User owns this resource
  }
  
  // Check account membership
  if (resourceData.accountId) {
    const accessibleAccountIds = await permissionService.getAccessibleAccountIds(userId);
    return accessibleAccountIds.includes(resourceData.accountId);
  }
  
  return false;
}