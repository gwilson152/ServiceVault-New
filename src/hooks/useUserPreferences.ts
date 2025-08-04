"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface TimePageFilters {
  filterPeriod: string;
  filterTicket: string;
  filterAccount: string;
  filterUser: string;
  filterBillingStatus: string;
  filterApprovalStatus: string;
  filterInvoiceStatus: string;
  filterBillingRate: string;
  filterDateStart: string;
  filterDateEnd: string;
  showAdvancedFilters: boolean;
}

interface UserPreferences {
  timePageFilters?: TimePageFilters;
  // Add other page preferences here as needed
  // dashboardSettings?: DashboardSettings;
  // billingPageFilters?: BillingPageFilters;
}

export function useUserPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences from server
  const fetchPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/user/preferences');
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences || {});
      } else {
        setError('Failed to load preferences');
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Update entire preferences object
  const updatePreferences = useCallback(async (newPreferences: UserPreferences) => {
    if (!session?.user?.id) return;

    try {
      setError(null);
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        return true;
      } else {
        setError('Failed to save preferences');
        return false;
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to save preferences');
      return false;
    }
  }, [session?.user?.id]);

  // Update a specific preference key
  const updatePreference = useCallback(async (key: string, value: any) => {
    if (!session?.user?.id) return;

    try {
      setError(null);
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        return true;
      } else {
        setError('Failed to save preference');
        return false;
      }
    } catch (err) {
      console.error('Error updating preference:', err);
      setError('Failed to save preference');
      return false;
    }
  }, [session?.user?.id]);

  // Specific helper for time page filters
  const getTimePageFilters = useCallback((): TimePageFilters => {
    return preferences.timePageFilters || {
      filterPeriod: "last7days",
      filterTicket: "all",
      filterAccount: "all",
      filterUser: "all",
      filterBillingStatus: "all",
      filterApprovalStatus: "all",
      filterInvoiceStatus: "all",
      filterBillingRate: "all",
      filterDateStart: "",
      filterDateEnd: "",
      showAdvancedFilters: false
    };
  }, [preferences.timePageFilters]);

  const updateTimePageFilters = useCallback(async (filters: Partial<TimePageFilters>) => {
    const currentFilters = getTimePageFilters();
    const newFilters = { ...currentFilters, ...filters };
    return await updatePreference('timePageFilters', newFilters);
  }, [getTimePageFilters, updatePreference]);

  // Load preferences when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [session?.user?.id, fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    updatePreference,
    getTimePageFilters,
    updateTimePageFilters,
    refetch: fetchPreferences
  };
}