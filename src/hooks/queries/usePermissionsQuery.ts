import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PermissionCheck } from "@/lib/permissions";

export interface PermissionResult {
  [key: string]: boolean;
}

const fetchPermissions = async (permissions: PermissionCheck[]): Promise<PermissionResult> => {
  if (!permissions.length) {
    return {};
  }

  const response = await fetch('/api/permissions/check-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ permissions }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch permissions: ${response.statusText}`);
  }

  return response.json();
};

const fetchSinglePermission = async (permission: PermissionCheck): Promise<boolean> => {
  const response = await fetch('/api/permissions/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(permission),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch permission: ${response.statusText}`);
  }

  const result = await response.json();
  return result.hasPermission;
};

// Generate cache key for permission check
const getPermissionCacheKey = (permission: PermissionCheck): string => {
  return `${permission.resource}:${permission.action}:${permission.scope || 'default'}:${permission.accountId || 'global'}`;
};

// Hook for batch permission checking
export function usePermissionsQuery(permissions: PermissionCheck[]) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['permissions', 'batch', permissions.map(getPermissionCacheKey)],
    queryFn: () => fetchPermissions(permissions),
    enabled: !!session?.user?.id && permissions.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for single permission checking
export function usePermissionQuery(permission: PermissionCheck) {
  const { data: session } = useSession();
  
  return useQuery({
    queryKey: ['permissions', 'single', getPermissionCacheKey(permission)],
    queryFn: () => fetchSinglePermission(permission),
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for common permission sets - pre-defined bundles
export function useCommonPermissionsQuery() {
  const { data: session } = useSession();
  
  // Define common permissions that most pages need
  const commonPermissions: PermissionCheck[] = [
    { resource: 'time-entries', action: 'view' },
    { resource: 'time-entries', action: 'create' },
    { resource: 'time-entries', action: 'update' },
    { resource: 'time-entries', action: 'delete' },
    { resource: 'time-entries', action: 'approve' },
    { resource: 'tickets', action: 'view' },
    { resource: 'tickets', action: 'create' },
    { resource: 'tickets', action: 'update' },
    { resource: 'accounts', action: 'view' },
    { resource: 'invoices', action: 'view' },
    { resource: 'invoices', action: 'create' },
    { resource: 'billing', action: 'view' },
    { resource: 'settings', action: 'view' },
  ];
  
  return useQuery({
    queryKey: ['permissions', 'common'],
    queryFn: () => fetchPermissions(commonPermissions),
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - stable permissions
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}