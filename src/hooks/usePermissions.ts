import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import type { UserPermissions } from '@/lib/permissions/PermissionService';

interface UsePermissionsReturn {
  hasPermission: (resource: string, action: string, accountId?: string) => boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  permissions: UserPermissions | undefined;
  canViewTimeEntries: () => boolean;
  canCreateTimeEntries: () => boolean;
  canEditTimeEntries: () => boolean;
  canApproveTimeEntries: () => boolean;
  canViewBilling: () => boolean;
  canCreateInvoices: () => boolean;
  canViewAccounts: () => boolean;
  canManageUsers: () => boolean;
}

/**
 * Clean, optimized permissions hook using the new PermissionService
 */
export function usePermissions(): UsePermissionsReturn {
  const { data: session } = useSession();
  
  // Fetch user permissions with caching
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) throw new Error('No user session');
      
      const response = await fetch('/api/auth/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      
      const data = await response.json();
      
      // Convert serialized format back to Maps and Sets
      return {
        isSuperAdmin: data.isSuperAdmin,
        systemPermissions: new Set(data.systemPermissions),
        accountPermissions: new Map(
          Object.entries(data.accountPermissions).map(([accountId, perms]) => [
            accountId,
            new Set(perms as string[])
          ])
        )
      } as UserPermissions;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Generic permission checker
  const hasPermission = useCallback((
    resource: string, 
    action: string, 
    accountId?: string
  ): boolean => {
    if (!permissions) return false;
    
    // Super admin bypasses all checks
    if (permissions.isSuperAdmin) return true;
    
    const permissionKey = `${resource}:${action}`;
    const wildcardResource = `${resource}:*`;
    const wildcardAll = '*:*';
    
    // Check system permissions
    if (permissions.systemPermissions.has(permissionKey) ||
        permissions.systemPermissions.has(wildcardResource) ||
        permissions.systemPermissions.has(wildcardAll)) {
      return true;
    }
    
    // Check account-specific permissions
    if (accountId && permissions.accountPermissions.has(accountId)) {
      const accountPerms = permissions.accountPermissions.get(accountId)!;
      return accountPerms.has(permissionKey) || 
             accountPerms.has(wildcardResource) ||
             accountPerms.has(wildcardAll);
    }
    
    return false;
  }, [permissions]);

  // Convenience methods for common permissions
  const canViewTimeEntries = useCallback(() => 
    hasPermission('time-entries', 'view'), [hasPermission]);
  
  const canCreateTimeEntries = useCallback(() => 
    hasPermission('time-entries', 'create'), [hasPermission]);
  
  const canEditTimeEntries = useCallback(() => 
    hasPermission('time-entries', 'update'), [hasPermission]);
  
  const canApproveTimeEntries = useCallback(() => 
    hasPermission('time-entries', 'approve'), [hasPermission]);
  
  const canViewBilling = useCallback(() => 
    hasPermission('billing', 'view'), [hasPermission]);
  
  const canCreateInvoices = useCallback(() => 
    hasPermission('invoices', 'create'), [hasPermission]);
  
  const canViewAccounts = useCallback(() => 
    hasPermission('accounts', 'view'), [hasPermission]);
  
  const canManageUsers = useCallback(() => 
    hasPermission('users', 'manage'), [hasPermission]);

  return {
    hasPermission,
    isSuperAdmin: permissions?.isSuperAdmin || false,
    loading: isLoading,
    permissions,
    canViewTimeEntries,
    canCreateTimeEntries,
    canEditTimeEntries,
    canApproveTimeEntries,
    canViewBilling,
    canCreateInvoices,
    canViewAccounts,
    canManageUsers
  };
}

/**
 * Hook for checking permissions on specific resources with IDs
 */
export function useResourcePermissions(resourceType: string, resourceId?: string) {
  const { hasPermission, isSuperAdmin, loading } = usePermissions();
  
  return {
    canView: useCallback(() => 
      hasPermission(resourceType, 'view', resourceId), [hasPermission, resourceType, resourceId]),
    canEdit: useCallback(() => 
      hasPermission(resourceType, 'update', resourceId), [hasPermission, resourceType, resourceId]),
    canDelete: useCallback(() => 
      hasPermission(resourceType, 'delete', resourceId), [hasPermission, resourceType, resourceId]),
    canCreate: useCallback(() => 
      hasPermission(resourceType, 'create', resourceId), [hasPermission, resourceType, resourceId]),
    isSuperAdmin,
    loading
  };
}