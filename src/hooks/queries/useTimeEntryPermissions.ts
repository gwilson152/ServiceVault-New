import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";

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


/**
 * Hook to get time entry permissions using the new permission system
 * This calculates entry-specific permissions client-side based on cached permissions
 */
export function useTimeEntryPermissions(timeEntries: TimeEntry[]) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { canEditTimeEntries, loading, isSuperAdmin } = usePermissions();

  // Calculate permissions for each entry based on permissions and entry state
  const entryPermissions = useMemo(() => {
    const permissionsMap = new Map<string, TimeEntryPermissions>();
    
    if (!session?.user?.id || !Array.isArray(timeEntries)) {
      return permissionsMap;
    }

    for (const entry of timeEntries) {
      // Check entry state
      const isOwner = entry.userId === session.user.id;
      const isLocked = entry.invoiceItems && entry.invoiceItems.length > 0;
      const isApproved = entry.isApproved;
      
      // Calculate permissions based on state and permissions
      let canEdit = false;
      let canDelete = false;
      
      // Can't modify locked (invoiced) entries
      if (!isLocked) {
        // Super admins can edit any entry, others need specific permissions
        if (isSuperAdmin) {
          canEdit = true;
          canDelete = true;
        } else {
          // For editing: must not be approved unless super admin or owner with edit permission
          if (!isApproved) {
            canEdit = canEditTimeEntries || (isOwner && canEditTimeEntries);
          }
          
          // For deleting: use same logic as editing for now
          canDelete = canEditTimeEntries || (isOwner && canEditTimeEntries);
        }
      }
      
      permissionsMap.set(entry.id, { canEdit, canDelete });
    }
    
    return permissionsMap;
  }, [timeEntries, canEditTimeEntries, isSuperAdmin, session?.user?.id]);

  // Function to invalidate permissions cache (e.g., after role changes)
  const invalidatePermissions = () => {
    queryClient.invalidateQueries({ 
      queryKey: ['user-permissions', session?.user?.id] 
    });
  };

  return {
    permissions: entryPermissions,
    isLoading: loading,
    invalidatePermissions,
  };
}

/**
 * Hook to check if user can approve time entries
 */
export function useCanApproveTimeEntries() {
  const { canApproveTimeEntries, loading } = usePermissions();

  return {
    canApprove: canApproveTimeEntries,
    isLoading: loading,
  };
}