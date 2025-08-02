"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { PERMISSIONS, PermissionCheck } from "@/lib/permissions";

interface CachedPermissions {
  [key: string]: boolean;
}

export function usePermissions() {
  const { data: session } = useSession();
  const [permissionCache, setPermissionCache] = useState<CachedPermissions>({});
  const [isLoading, setIsLoading] = useState(false);

  // Generate cache key for permission check
  const getCacheKey = (permission: PermissionCheck): string => {
    return `${permission.resource}:${permission.action}:${permission.scope || 'default'}`;
  };

  // Check if user has a specific permission
  const hasPermission = async (permission: PermissionCheck): Promise<boolean> => {
    if (!session?.user?.id) {
      return false;
    }

    const cacheKey = getCacheKey(permission);
    
    // Return cached result if available
    if (permissionCache[cacheKey] !== undefined) {
      return permissionCache[cacheKey];
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permission),
      });

      if (response.ok) {
        const { hasPermission: result } = await response.json();
        
        // Cache the result
        setPermissionCache(prev => ({
          ...prev,
          [cacheKey]: result
        }));
        
        return result;
      }
    } catch (error) {
      console.error('Error checking permission:', error);
    } finally {
      setIsLoading(false);
    }

    return false;
  };

  // Batch check multiple permissions
  const checkPermissions = async (permissions: PermissionCheck[]): Promise<Record<string, boolean>> => {
    if (!session?.user?.id) {
      return {};
    }

    const results: Record<string, boolean> = {};
    const uncachedPermissions: PermissionCheck[] = [];
    
    // Check cache first
    for (const permission of permissions) {
      const cacheKey = getCacheKey(permission);
      if (permissionCache[cacheKey] !== undefined) {
        results[cacheKey] = permissionCache[cacheKey];
      } else {
        uncachedPermissions.push(permission);
      }
    }

    // Fetch uncached permissions
    if (uncachedPermissions.length > 0) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/permissions/check-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permissions: uncachedPermissions }),
        });

        if (response.ok) {
          const batchResults = await response.json();
          
          // Update cache and results
          const newCacheEntries: CachedPermissions = {};
          for (const permission of uncachedPermissions) {
            const cacheKey = getCacheKey(permission);
            const result = batchResults[cacheKey] || false;
            newCacheEntries[cacheKey] = result;
            results[cacheKey] = result;
          }
          
          setPermissionCache(prev => ({ ...prev, ...newCacheEntries }));
        }
      } catch (error) {
        console.error('Error batch checking permissions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    return results;
  };

  // Clear permission cache (useful when user permissions change)
  const clearCache = () => {
    setPermissionCache({});
  };

  // Helper functions for common permission checks
  const canViewTimeEntries = () => hasPermission(PERMISSIONS.TIME_ENTRIES.VIEW);
  const canCreateTimeEntries = () => hasPermission(PERMISSIONS.TIME_ENTRIES.CREATE);
  const canUpdateTimeEntries = () => hasPermission(PERMISSIONS.TIME_ENTRIES.UPDATE);
  const canDeleteTimeEntries = () => hasPermission(PERMISSIONS.TIME_ENTRIES.DELETE);
  const canApproveTimeEntries = () => hasPermission(PERMISSIONS.TIME_ENTRIES.APPROVE);
  const canViewBilling = () => hasPermission(PERMISSIONS.BILLING.VIEW);
  const canUpdateBilling = () => hasPermission(PERMISSIONS.BILLING.UPDATE);
  const canViewReports = () => hasPermission(PERMISSIONS.REPORTS.VIEW);
  const canViewSettings = () => hasPermission(PERMISSIONS.SETTINGS.VIEW);
  const canUpdateSettings = () => hasPermission(PERMISSIONS.SETTINGS.UPDATE);
  const canCreateUsers = () => hasPermission(PERMISSIONS.USERS.CREATE);
  const canInviteUsers = () => hasPermission(PERMISSIONS.USERS.INVITE);
  const canManageUsers = () => hasPermission(PERMISSIONS.USERS.MANAGE);
  const canUpdateUsers = () => hasPermission(PERMISSIONS.USERS.UPDATE);
  const canDeleteUsers = () => hasPermission(PERMISSIONS.USERS.DELETE);
  const canCreateUsersManually = () => hasPermission(PERMISSIONS.USERS.CREATE_MANUAL);
  const canResendInvitations = () => hasPermission(PERMISSIONS.USERS.RESEND_INVITATION);
  const canViewInvoices = () => hasPermission(PERMISSIONS.INVOICES.VIEW);
  const canCreateInvoices = () => hasPermission(PERMISSIONS.INVOICES.CREATE);
  const canUpdateInvoices = () => hasPermission(PERMISSIONS.INVOICES.UPDATE);
  const canDeleteInvoices = () => hasPermission(PERMISSIONS.INVOICES.DELETE);
  const canEditInvoiceItems = () => hasPermission(PERMISSIONS.INVOICES.EDIT_ITEMS);

  // Clear cache when session changes
  useEffect(() => {
    if (session?.user?.id) {
      clearCache();
    }
  }, [session?.user?.id]);

  return {
    hasPermission,
    checkPermissions,
    clearCache,
    isLoading,
    
    // Common permission helpers
    canViewTimeEntries,
    canCreateTimeEntries,
    canUpdateTimeEntries,
    canDeleteTimeEntries,
    canApproveTimeEntries,
    canViewBilling,
    canUpdateBilling,
    canViewReports,
    canViewSettings,
    canUpdateSettings,
    canCreateUsers,
    canInviteUsers,
    canManageUsers,
    canUpdateUsers,
    canDeleteUsers,
    canCreateUsersManually,
    canResendInvitations,
    canViewInvoices,
    canCreateInvoices,
    canUpdateInvoices,
    canDeleteInvoices,
    canEditInvoiceItems,
  };
}

// Hook for specific time entry permissions with additional context
export function useTimeEntryPermissions(timeEntry?: {
  id: string;
  userId: string;
  isApproved: boolean;
  invoiceItems?: Array<{ invoice: { id: string; status: string } }>;
}) {
  const { hasPermission } = usePermissions();
  const { data: session } = useSession();

  const canEdit = async (): Promise<boolean> => {
    if (!timeEntry || !session?.user) {
      return false;
    }

    // Cannot edit if associated with any invoice
    if (timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0) {
      return false;
    }

    // Cannot edit approved entries (unless special permission)
    if (timeEntry.isApproved) {
      return false;
    }

    // Check base permission
    const hasUpdatePermission = await hasPermission(PERMISSIONS.TIME_ENTRIES.UPDATE);
    if (!hasUpdatePermission) {
      return false;
    }

    // Check if user can edit all entries or just their own
    const canEditAll = await hasPermission({ resource: 'time-entries', action: 'update', scope: 'global' });
    return canEditAll || timeEntry.userId === session.user.id;
  };

  const canDelete = async (): Promise<boolean> => {
    if (!timeEntry || !session?.user) {
      return false;
    }

    // Cannot delete if associated with any invoice
    if (timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0) {
      return false;
    }

    // Check base permission
    const hasDeletePermission = await hasPermission(PERMISSIONS.TIME_ENTRIES.DELETE);
    if (!hasDeletePermission) {
      return false;
    }

    // Check if user can delete all entries or just their own
    const canDeleteAll = await hasPermission({ resource: 'time-entries', action: 'delete', scope: 'global' });
    return canDeleteAll || timeEntry.userId === session.user.id;
  };

  const canApprove = async (): Promise<boolean> => {
    if (!timeEntry) {
      return false;
    }

    // Cannot approve if already approved or associated with invoice
    if (timeEntry.isApproved || (timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0)) {
      return false;
    }

    return await hasPermission(PERMISSIONS.TIME_ENTRIES.APPROVE);
  };

  const isLocked = (): boolean => {
    if (!timeEntry) {
      return false;
    }

    // Entry is locked if it has invoice associations
    return !!(timeEntry.invoiceItems && timeEntry.invoiceItems.length > 0);
  };

  const getLockReason = (): string | null => {
    if (!timeEntry?.invoiceItems || timeEntry.invoiceItems.length === 0) {
      return null;
    }

    const invoice = timeEntry.invoiceItems[0]?.invoice;
    if (invoice) {
      return `This time entry is part of Invoice #${invoice.id} (${invoice.status}) and cannot be modified.`;
    }

    return "This time entry is associated with an invoice and cannot be modified.";
  };

  return {
    canEdit,
    canDelete,
    canApprove,
    isLocked,
    getLockReason,
  };
}

// Hook for invoice-specific permissions with account context
export function useInvoicePermissions(invoice?: {
  id: string;
  status: string;
  accountId: string;
  creatorId: string;
}) {
  const { hasPermission } = usePermissions();
  const { data: session } = useSession();

  const canView = async (): Promise<boolean> => {
    if (!invoice || !session?.user) {
      return false;
    }

    // Check base permission with account context
    const hasViewPermission = await hasPermission({
      resource: 'invoices',
      action: 'view',
      accountId: invoice.accountId
    });

    if (!hasViewPermission) {
      return false;
    }

    // Check scope-based access
    const canViewAll = await hasPermission({ 
      resource: 'invoices', 
      action: 'view', 
      scope: 'subsidiary',
      accountId: invoice.accountId 
    });
    
    const canViewAccount = await hasPermission({ 
      resource: 'invoices', 
      action: 'view', 
      scope: 'account',
      accountId: invoice.accountId 
    });
    
    const canViewOwn = await hasPermission({ 
      resource: 'invoices', 
      action: 'view', 
      scope: 'own',
      accountId: invoice.accountId 
    });

    return canViewAll || canViewAccount || (canViewOwn && invoice.creatorId === session.user.id);
  };

  const canEdit = async (): Promise<boolean> => {
    if (!invoice || !session?.user) {
      return false;
    }

    // Only DRAFT invoices can be edited
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Check base permission
    const hasUpdatePermission = await hasPermission({
      resource: 'invoices',
      action: 'update',
      accountId: invoice.accountId
    });

    if (!hasUpdatePermission) {
      return false;
    }

    // Check scope-based access
    const canEditAll = await hasPermission({ 
      resource: 'invoices', 
      action: 'update', 
      scope: 'subsidiary',
      accountId: invoice.accountId 
    });
    
    const canEditAccount = await hasPermission({ 
      resource: 'invoices', 
      action: 'update', 
      scope: 'account',
      accountId: invoice.accountId 
    });
    
    const canEditOwn = await hasPermission({ 
      resource: 'invoices', 
      action: 'update', 
      scope: 'own',
      accountId: invoice.accountId 
    });

    return canEditAll || canEditAccount || (canEditOwn && invoice.creatorId === session.user.id);
  };

  const canEditItems = async (): Promise<boolean> => {
    if (!invoice || !session?.user) {
      return false;
    }

    // Only DRAFT invoices can have items edited
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Check specific edit-items permission
    const hasEditItemsPermission = await hasPermission({
      resource: 'invoices',
      action: 'edit-items',
      accountId: invoice.accountId
    });

    if (!hasEditItemsPermission) {
      return false;
    }

    // Check scope-based access
    const canEditAll = await hasPermission({ 
      resource: 'invoices', 
      action: 'edit-items', 
      scope: 'subsidiary',
      accountId: invoice.accountId 
    });
    
    const canEditAccount = await hasPermission({ 
      resource: 'invoices', 
      action: 'edit-items', 
      scope: 'account',
      accountId: invoice.accountId 
    });
    
    const canEditOwn = await hasPermission({ 
      resource: 'invoices', 
      action: 'edit-items', 
      scope: 'own',
      accountId: invoice.accountId 
    });

    return canEditAll || canEditAccount || (canEditOwn && invoice.creatorId === session.user.id);
  };

  const canDelete = async (): Promise<boolean> => {
    if (!invoice || !session?.user) {
      return false;
    }

    // Only DRAFT invoices can be deleted
    if (invoice.status !== 'DRAFT') {
      return false;
    }

    // Check base permission
    const hasDeletePermission = await hasPermission({
      resource: 'invoices',
      action: 'delete',
      accountId: invoice.accountId
    });

    if (!hasDeletePermission) {
      return false;
    }

    // Check scope-based access
    const canDeleteAll = await hasPermission({ 
      resource: 'invoices', 
      action: 'delete', 
      scope: 'subsidiary',
      accountId: invoice.accountId 
    });
    
    const canDeleteAccount = await hasPermission({ 
      resource: 'invoices', 
      action: 'delete', 
      scope: 'account',
      accountId: invoice.accountId 
    });
    
    const canDeleteOwn = await hasPermission({ 
      resource: 'invoices', 
      action: 'delete', 
      scope: 'own',
      accountId: invoice.accountId 
    });

    return canDeleteAll || canDeleteAccount || (canDeleteOwn && invoice.creatorId === session.user.id);
  };

  const isEditable = (): boolean => {
    if (!invoice) {
      return false;
    }

    // Only DRAFT invoices are editable
    return invoice.status === 'DRAFT';
  };

  const getStatusReason = (): string | null => {
    if (!invoice) {
      return null;
    }

    if (invoice.status !== 'DRAFT') {
      return `This invoice is ${invoice.status.toLowerCase()} and cannot be modified.`;
    }

    return null;
  };

  return {
    canView,
    canEdit,
    canEditItems,
    canDelete,
    isEditable,
    getStatusReason,
  };
}