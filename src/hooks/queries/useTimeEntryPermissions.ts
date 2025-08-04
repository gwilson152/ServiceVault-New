import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

export interface TimeEntry {
  id: string;
  userId: string;
  isApproved: boolean;
  invoiceItems?: Array<{ invoice: { id: string } }>;
  [key: string]: any;
}

export interface TimeEntryPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

interface PermissionSet {
  canUpdateOwn: boolean;
  canDeleteOwn: boolean;
  canUpdateAny: boolean;
  canDeleteAny: boolean;
}

// Fetch base permissions for time entries
const fetchTimeEntryPermissions = async (): Promise<PermissionSet> => {
  const response = await fetch('/api/permissions/check-batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      permissions: [
        { resource: 'time-entries', action: 'update', scope: 'own' },
        { resource: 'time-entries', action: 'delete', scope: 'own' },
        { resource: 'time-entries', action: 'update', scope: 'any' },
        { resource: 'time-entries', action: 'delete', scope: 'any' },
      ]
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch time entry permissions');
  }

  const results = await response.json();
  
  return {
    canUpdateOwn: results['time-entries:update:own'] || false,
    canDeleteOwn: results['time-entries:delete:own'] || false,
    canUpdateAny: results['time-entries:update:any'] || false,
    canDeleteAny: results['time-entries:delete:any'] || false,
  };
};

/**
 * Hook to get time entry permissions using TanStack Query
 * This fetches base permissions once and calculates entry-specific permissions
 * client-side to avoid excessive API calls and infinite loops
 */
export function useTimeEntryPermissions(timeEntries: TimeEntry[]) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  // Fetch base permissions using TanStack Query (cached and stable)
  const { data: basePermissions, isLoading } = useQuery({
    queryKey: ['permissions', 'time-entries', session?.user?.id],
    queryFn: fetchTimeEntryPermissions,
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Calculate permissions for each entry based on base permissions and entry state
  // This is done client-side to avoid API calls and state updates
  const entryPermissions = useMemo(() => {
    const permissionsMap = new Map<string, TimeEntryPermissions>();
    
    if (!basePermissions || !session?.user?.id) {
      return permissionsMap;
    }

    for (const entry of timeEntries) {
      // Check entry state
      const isOwner = entry.userId === session.user.id;
      const isLocked = entry.invoiceItems && entry.invoiceItems.length > 0;
      const isApproved = entry.isApproved;
      
      // Calculate permissions based on state and base permissions
      let canEdit = false;
      let canDelete = false;
      
      // Can't modify locked (invoiced) entries
      if (!isLocked) {
        // For editing: must not be approved (unless has special permission)
        if (!isApproved) {
          canEdit = basePermissions.canUpdateAny || (basePermissions.canUpdateOwn && isOwner);
        }
        
        // For deleting: check ownership and permissions
        canDelete = basePermissions.canDeleteAny || (basePermissions.canDeleteOwn && isOwner);
      }
      
      permissionsMap.set(entry.id, { canEdit, canDelete });
    }
    
    return permissionsMap;
  }, [timeEntries, basePermissions, session?.user?.id]);

  // Function to invalidate permissions cache (e.g., after role changes)
  const invalidatePermissions = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['permissions', 'time-entries', session?.user?.id] 
    });
  };

  return {
    permissions: entryPermissions,
    isLoading,
    invalidatePermissions,
  };
}

/**
 * Hook to check if user can approve time entries
 */
export function useCanApproveTimeEntries() {
  const { data: session } = useSession();
  
  const { data: canApprove, isLoading } = useQuery({
    queryKey: ['permissions', 'time-entries', 'approve', session?.user?.id],
    queryFn: async () => {
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource: 'time-entries',
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check approval permission');
      }

      const result = await response.json();
      return result.hasPermission || false;
    },
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    canApprove: canApprove || false,
    isLoading,
  };
}