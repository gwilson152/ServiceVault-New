import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface SettingsPermissions {
  canView: boolean;
  canUpdate: boolean;
}

const fetchSettingsPermissions = async (): Promise<SettingsPermissions> => {
  const response = await fetch('/api/permissions/check-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      permissions: [
        { resource: 'settings', action: 'view' },
        { resource: 'settings', action: 'update' },
      ]
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings permissions');
  }

  const results = await response.json();
  
  return {
    canView: results['settings:view:default'] || false,
    canUpdate: results['settings:update:default'] || false,
  };
};

/**
 * Hook to get settings permissions using TanStack Query
 * Avoids infinite loops by using stable cached values
 */
export function useSettingsPermissions() {
  const { data: session } = useSession();
  
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['permissions', 'settings', session?.user?.id],
    queryFn: fetchSettingsPermissions,
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    canViewSettings: permissions?.canView || false,
    canUpdateSettings: permissions?.canUpdate || false,
    isLoading,
  };
}