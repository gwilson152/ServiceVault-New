import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import type { UserPermissions } from '@/lib/permissions/PermissionService';

interface UsePermissionsReturn {
  hasPermission: (resource: string, action: string, accountId?: string) => boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  permissions: UserPermissions | undefined;
  canViewTimeEntries: boolean;
  canCreateTimeEntries: boolean;
  canEditTimeEntries: boolean;
  canApproveTimeEntries: boolean;
  canViewBilling: boolean;
  canCreateBilling: boolean;
  canUpdateBilling: boolean;
  canDeleteBilling: boolean;
  canViewInvoices: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canDeleteInvoices: boolean;
  canViewAccounts: boolean;
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageUsers: boolean;
  canViewTickets: boolean;
  canCreateTickets: boolean;
  canEditTickets: boolean;
  canDeleteTickets: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  canViewReports: boolean;
  canViewRoleTemplates: boolean;
  canCreateRoleTemplates: boolean;
  canEditRoleTemplates: boolean;
  canDeleteRoleTemplates: boolean;
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

  // Convenience computed values for common permissions
  const canViewTimeEntries = hasPermission('time-entries', 'view');
  const canCreateTimeEntries = hasPermission('time-entries', 'create');
  const canEditTimeEntries = hasPermission('time-entries', 'update');
  const canApproveTimeEntries = hasPermission('time-entries', 'approve');
  const canViewBilling = hasPermission('billing', 'view');
  const canCreateBilling = hasPermission('billing', 'create');
  const canUpdateBilling = hasPermission('billing', 'update');
  const canDeleteBilling = hasPermission('billing', 'delete');
  const canViewInvoices = hasPermission('invoices', 'view');
  const canCreateInvoices = hasPermission('invoices', 'create');
  const canEditInvoices = hasPermission('invoices', 'edit');
  const canDeleteInvoices = hasPermission('invoices', 'delete');
  const canViewAccounts = hasPermission('accounts', 'view');
  const canViewUsers = hasPermission('users', 'view');
  const canCreateUsers = hasPermission('users', 'create');
  const canEditUsers = hasPermission('users', 'edit');
  const canDeleteUsers = hasPermission('users', 'delete');
  const canManageUsers = hasPermission('users', 'manage');
  const canViewTickets = hasPermission('tickets', 'view');
  const canCreateTickets = hasPermission('tickets', 'create');
  const canEditTickets = hasPermission('tickets', 'update');
  const canDeleteTickets = hasPermission('tickets', 'delete');
  const canViewSettings = hasPermission('system', 'admin');
  const canEditSettings = hasPermission('settings', 'edit');
  const canViewReports = hasPermission('reports', 'view');
  const canViewRoleTemplates = hasPermission('role-templates', 'view');
  const canCreateRoleTemplates = hasPermission('role-templates', 'create');
  const canEditRoleTemplates = hasPermission('role-templates', 'edit');
  const canDeleteRoleTemplates = hasPermission('role-templates', 'delete');

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
    canCreateBilling,
    canUpdateBilling,
    canDeleteBilling,
    canViewInvoices,
    canCreateInvoices,
    canEditInvoices,
    canDeleteInvoices,
    canViewAccounts,
    canViewUsers,
    canCreateUsers,
    canEditUsers,
    canDeleteUsers,
    canManageUsers,
    canViewTickets,
    canCreateTickets,
    canEditTickets,
    canDeleteTickets,
    canViewSettings,
    canEditSettings,
    canViewReports,
    canViewRoleTemplates,
    canCreateRoleTemplates,
    canEditRoleTemplates,
    canDeleteRoleTemplates
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