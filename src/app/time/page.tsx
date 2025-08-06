/**
 * TIME TRACKING PAGE
 * 
 * Purpose: Central hub for time entry management, timer controls, and time reporting
 * Access: ADMIN and EMPLOYEE roles only, requires TIME_ENTRIES.VIEW permission
 * 
 * Key Functions:
 * - View and filter time entries with advanced filtering options (period, status, account, user)
 * - Create manual time entries for tickets or accounts directly
 * - Display time statistics (today, week, month, billable amounts for permitted users)
 * - Integrate with global timer system for seamless time tracking workflow
 * - Time entry approval workflow for managers with appropriate permissions
 * 
 * Related Pages:
 * - /tickets - Time entries are often created from ticket context via timer widgets
 * - /billing - Time entries feed into invoice generation and billing workflows
 * - /dashboard - Summary time stats are displayed on dashboard overview
 * - /accounts - Account selection for time entries and account-scoped filtering
 * 
 * API Dependencies:
 * - GET /api/time-entries - Fetch time entries with server-side role-based filtering
 * - POST /api/tickets/[id]/time-entries - Create time entries for specific tickets
 * - POST /api/accounts/[id]/time-entries - Create direct account time entries
 * - GET /api/accounts - Account list for form dropdowns and filtering
 * - GET /api/tickets - Ticket list for form dropdowns and filtering
 * - GET /api/billing/rates - Billing rates for time entry creation (permission-based)
 * - GET /api/users - User list for filtering (admin/manager view)
 * 
 * Components Used:
 * - TimeEntryCard - Display individual time entries with permission-based actions
 * - TimeEntryEditDialog - Edit existing time entries with validation
 * - TimeEntryApprovalWizard - Bulk approval workflow for managers
 * - AccountSelector - Hierarchical account selection for filtering and forms
 * - TicketSelector - Ticket selection with filtering and search
 * - useTimeTracking - Integration with global timer system for logged events
 * 
 * State Management:
 * - Local state: Filter settings, form data, dialog visibility states
 * - Global state: useTimeTracking for timer integration, useActionBar for contextual actions
 * - Data fetching: Manual useEffect with stable fetch functions (legacy pattern, needs TanStack Query migration)
 * - User preferences: Filter settings persisted via useUserPreferences hook
 * - Permission state: useTimeEntryPermissions for individual entry permissions
 * 
 * Navigation:
 * - Entry points: Main navigation, dashboard quick actions, timer "log time" workflow
 * - Exit points: Ticket details (via time entry links), billing page (for invoicing), account management
 * - Deep linking: Supports filter parameters in URL for bookmarking filtered views
 * 
 * Performance Notes:
 * - Fixed infinite query loop by using stable fetch function references
 * - Server-side permission filtering reduces client-side processing
 * - Batch permission checks for better performance on large entry lists
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountSelector } from "@/components/selectors/account-selector";
import { TicketSelector } from "@/components/selectors/ticket-selector";
import { Switch } from "@/components/ui/switch";
import { useTimeTracking } from "@/components/time/TimeTrackingProvider";
import { TimeEntryEditDialog } from "@/components/time/TimeEntryEditDialog";
import { TimeEntryApprovalWizard } from "@/components/time/TimeEntryApprovalWizard";
import { TimeEntryCard } from "@/components/time/TimeEntryCard";
import { usePermissions } from "@/hooks/usePermissions";
import { useTimeEntryPermissions, useCanApproveTimeEntries } from "@/hooks/queries/useTimeEntryPermissions";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { formatMinutes } from "@/lib/time-utils";
import { 
  Clock, 
  Plus, 
  Calendar,
  Timer,
  DollarSign,
  Edit,
  Trash2,
  Building,
  FileText,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";

// Helper function to get start of week
const getStartOfWeek = (date: Date, mondayFirst: boolean = true): Date => {
  const startOfWeek = new Date(date);
  const dayOfWeek = startOfWeek.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  if (mondayFirst) {
    // Calculate days to subtract to get to Monday
    // If today is Monday (1), subtract 0 days
    // If today is Tuesday (2), subtract 1 day
    // If today is Sunday (0), subtract 6 days (go back to previous Monday)
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  } else {
    // Sunday-based week (JavaScript default)
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
  }
  
  startOfWeek.setHours(0, 0, 0, 0); // Set to beginning of day
  return startOfWeek;
};

export default function TimeTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entries");
  const initialDataFetched = useRef(false);
  
  // Permission hooks
  const {
    canViewTimeEntries,
    canCreateTimeEntries,
    canViewBilling,
    canViewReports,
    isLoading: permissionsLoading
  } = usePermissions();
  
  // User preferences hook
  const {
    getTimePageFilters,
    updateTimePageFilters,
    isLoading: preferencesLoading
  } = useUserPreferences();
  
  // Action bar management
  const { addAction, clearActions } = useActionBar();
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approvalWizardOpen, setApprovalWizardOpen] = useState(false);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState<any>(null);
  
  // Register for timer logged events to auto-refresh data (but no timer controls)
  const { registerTimerLoggedCallback } = useTimeTracking();
  
  // Form state
  const [entryType, setEntryType] = useState<"ticket" | "account">("ticket");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [noCharge, setNoCharge] = useState(false);
  const [selectedBillingRate, setSelectedBillingRate] = useState<string>("none");
  
  // Data state
  const [accounts, setAccounts] = useState<Array<{id: string; name: string; accountType: string; parentAccountId?: string | null}>>([]);
  const [billingRates, setBillingRates] = useState<Array<{id: string; name: string; rate: number; description?: string}>>([]);
  const [tickets, setTickets] = useState<Array<{
    id: string; 
    ticketNumber: string; 
    title: string; 
    status: string;
    priority: string;
    account: {id: string; name: string};
    assignee?: {id: string; name: string} | null;
    totalTimeSpent?: number;
    timeEntriesCount?: number;
  }>>([]);
  const [users, setUsers] = useState<Array<{
    id: string;
    name: string;
    email: string;
  }>>([]);
  const [timeEntries, setTimeEntries] = useState<Array<{
    id: string;
    ticketId?: string;
    accountId?: string;
    description: string;
    minutes: number;
    date: string;
    noCharge: boolean;
    billingRateName?: string;
    billingRateValue?: number;
    isApproved: boolean;
    userId: string;
    user: {id: string; name: string; email: string};
    ticket?: {id: string; title: string; ticketNumber?: string; account: {id: string; name: string}};
    account?: {id: string; name: string};
    invoiceItems?: Array<{invoice: {id: string; invoiceNumber: string; status: string}}>;
  }>>([]);
  const [statistics, setStatistics] = useState<{
    todayMinutes: number;
    weekMinutes: number;
    monthMinutes: number;
    billableMinutes: number;
    billableAmount?: number;
  } | null>(null);
  // Use TanStack Query-based permission checking to avoid infinite loops
  const { permissions: timeEntryPermissions, isLoading: permissionsCheckLoading } = useTimeEntryPermissions(timeEntries);
  const { canApprove: canApproveTimeEntriesValue, isLoading: approvalPermissionLoading } = useCanApproveTimeEntries();

  // Filter state
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [filterTicket, setFilterTicket] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterBillingStatus, setFilterBillingStatus] = useState("all"); // all/billable/non-billable
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("all"); // all/approved/pending
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState("all"); // all/invoiced/not-invoiced
  const [filterBillingRate, setFilterBillingRate] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Permission-based visibility
  const [showBillingRates, setShowBillingRates] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);

  const fetchBillingRates = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/rates');
      if (response.ok) {
        const data = await response.json();
        setBillingRates(data || []);
      }
    } catch (error) {
      console.error('Error fetching billing rates:', error);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  const fetchTimeEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Apply filters - permission-based filtering is handled by the API
      if (filterTicket !== 'all') {
        params.append('ticketId', filterTicket);
      }
      
      params.append('limit', '50'); // Reasonable limit for UI
      
      const response = await fetch(`/api/time-entries?${params}`);
      if (response.ok) {
        const data = await response.json();
        const entries = data.timeEntries || [];
        setTimeEntries(entries);
        
        // Calculate statistics inline to avoid circular dependency
        const now = new Date();
        const today = now.toDateString();
        // Calculate start of week (Monday-based for business context)
        const startOfWeek = getStartOfWeek(now, true);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const todayMinutes = entries
          .filter((entry: any) => {
            const entryDate = new Date(entry.date);
            return entryDate.toDateString() === today;
          })
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        // Use "Last 7 Days" for week statistics to be more intuitive
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6); // 6 days ago + today = 7 days
        sevenDaysAgo.setHours(0, 0, 0, 0);
        
        const weekMinutes = entries
          .filter((entry: any) => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0); // Normalize to start of day
            return entryDate >= sevenDaysAgo;
          })
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        const monthMinutes = entries
          .filter((entry: any) => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0); // Normalize to start of day
            return entryDate >= startOfMonth;
          })
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        const billableEntries = entries.filter((entry: any) => !entry.noCharge);
        const billableMinutes = billableEntries
          .filter((entry: any) => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0); // Normalize to start of day
            return entryDate >= sevenDaysAgo;
          })
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        // Calculate billable amount (only for users with billing permissions)
        let billableAmount = undefined;
        if (canViewBilling) {
          billableAmount = billableEntries
            .filter((entry: any) => {
              const entryDate = new Date(entry.date);
              entryDate.setHours(0, 0, 0, 0); // Normalize to start of day
              return entryDate >= sevenDaysAgo;
            })
            .reduce((sum: number, entry: any) => {
              const hours = entry.minutes / 60;
              const rate = entry.billingRateValue || 0;
              return sum + (hours * rate);
            }, 0);
        }
        
        setStatistics({
          todayMinutes,
          weekMinutes,
          monthMinutes,
          billableMinutes,
          billableAmount
        });
        
        // Note: Batch permission check will be called separately to avoid circular dependency
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  }, [session?.user?.id, filterTicket, canViewBilling]);

  // calculateStatistics function moved inline to fetchTimeEntries to avoid circular dependency

  // Permissions are now handled by useTimeEntryPermissions hook using TanStack Query
  // This avoids the infinite loop caused by state updates in async functions

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading && !preferencesLoading) {
      // Check if user has permission to view time entries
      const checkAccess = () => {
        if (!canViewTimeEntries) {
          console.log(`Access denied to /time page for user: ${session.user?.email}. Redirecting to dashboard.`);
          router.push("/dashboard");
          return;
        }
        
        // Access granted - continue with initialization
        
        // Restore user's saved filter preferences
        const savedFilters = getTimePageFilters();
        setFilterPeriod(savedFilters.filterPeriod);
        setFilterTicket(savedFilters.filterTicket);
        setFilterAccount(savedFilters.filterAccount);
        setFilterUser(savedFilters.filterUser);
        setFilterBillingStatus(savedFilters.filterBillingStatus);
        setFilterApprovalStatus(savedFilters.filterApprovalStatus);
        setFilterInvoiceStatus(savedFilters.filterInvoiceStatus);
        setFilterBillingRate(savedFilters.filterBillingRate);
        setFilterDateStart(savedFilters.filterDateStart);
        setFilterDateEnd(savedFilters.filterDateEnd);
        setShowAdvancedFilters(savedFilters.showAdvancedFilters);
        
        setIsLoading(false);
        
        // Check billing permissions
        setShowBillingRates(canViewBilling);
        
        // Setup action bar actions (use pre-fetched value)
        if (canApproveTimeEntriesValue) {
          addAction({
            id: "approval-wizard",
            label: "Approval Wizard",
            icon: <Users className="h-4 w-4" />,
            onClick: () => setApprovalWizardOpen(true),
            variant: "secondary",
            tooltip: "Review and approve pending time entries"
          });
        }
        
        // Data fetching will be handled by separate useEffect
      };
      
      checkAccess();
    }
  }, [status, session?.user?.email, router, permissionsLoading, preferencesLoading, canViewTimeEntries, canViewBilling, canApproveTimeEntriesValue]);

  // Initial data fetching after access is granted
  useEffect(() => {
    if (!isLoading && canViewTimeEntries && session?.user && !initialDataFetched.current) {
      initialDataFetched.current = true;
      fetchAccounts();
      fetchBillingRates();
      fetchTickets();
      fetchUsers();
      fetchTimeEntries();
    }
  }, [isLoading, canViewTimeEntries, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup actions when component unmounts
  useEffect(() => {
    return () => {
      clearActions();
    };
  }, []);

  // Register for timer logged events to auto-refresh data
  useEffect(() => {
    const unregisterCallback = registerTimerLoggedCallback(() => {
      fetchTimeEntries(); // Refresh time entries which will also recalculate statistics
    });

    return unregisterCallback;
  }, [registerTimerLoggedCallback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh time entries when filters change (only for server-side filters)
  useEffect(() => {
    if (session?.user && !isLoading) {
      fetchTimeEntries();
    }
  }, [filterTicket, session?.user?.id, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle custom date range and period filter interaction
  useEffect(() => {
    // If user sets custom dates, switch to custom period
    if ((filterDateStart || filterDateEnd) && filterPeriod !== "custom") {
      setFilterPeriod("custom");
    }
    // If user switches away from custom period, clear custom dates
    else if (filterPeriod !== "custom" && (filterDateStart || filterDateEnd)) {
      setFilterDateStart("");
      setFilterDateEnd("");
    }
  }, [filterDateStart, filterDateEnd, filterPeriod]);

  // Save filter preferences when they change (debounced)
  useEffect(() => {
    if (!isLoading && !preferencesLoading) {
      const timeoutId = setTimeout(() => {
        updateTimePageFilters({
          filterPeriod,
          filterTicket,
          filterAccount,
          filterUser,
          filterBillingStatus,
          filterApprovalStatus,
          filterInvoiceStatus,
          filterBillingRate,
          filterDateStart,
          filterDateEnd,
          showAdvancedFilters
        });
      }, 500); // Debounce for 500ms to avoid too many API calls

      return () => clearTimeout(timeoutId);
    }
  }, [
    filterPeriod,
    filterTicket,
    filterAccount,
    filterUser,
    filterBillingStatus,
    filterApprovalStatus,
    filterInvoiceStatus,
    filterBillingRate,
    filterDateStart,
    filterDateEnd,
    showAdvancedFilters,
    isLoading,
    preferencesLoading
    // Removed updateTimePageFilters from dependencies to prevent infinite loop
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handler functions - must be declared before early returns to maintain hooks order
  const handleEditEntry = useCallback((entry: any) => {
    setSelectedTimeEntry(entry);
    setEditDialogOpen(true);
  }, []);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this time entry? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTimeEntries(); // Refresh the time entries list
      } else {
        alert("Failed to delete time entry");
      }
    } catch (error) {
      console.error('Failed to delete time entry:', error);
      alert("Failed to delete time entry");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenApprovalWizard = useCallback(() => {
    // Use the pre-fetched permission value instead of async call
    if (canApproveTimeEntriesValue) {
      setApprovalWizardOpen(true);
    } else {
      alert("You don't have permission to approve time entries");
    }
  }, [canApproveTimeEntriesValue]);

  const handleSubmitTimeEntry = useCallback(async () => {
    // Validation
    if (!minutes || !description.trim() || !date || !time) {
      alert("Please fill in all required fields");
      return;
    }

    if (entryType === "ticket" && !selectedTicket) {
      alert("Please select a ticket");
      return;
    }

    if (entryType === "account" && !selectedAccount) {
      alert("Please select an account");
      return;
    }

    const entryData = {
      description: description.trim(),
      minutes: parseInt(minutes),
      date,
      time,
      noCharge,
      billingRateId: selectedBillingRate !== "none" ? selectedBillingRate : null,
      ...(entryType === "ticket" 
        ? { ticketId: selectedTicket }
        : { accountId: selectedAccount }
      )
    };

    try {
      const endpoint = entryType === "ticket" 
        ? `/api/tickets/${selectedTicket}/time-entries`
        : `/api/accounts/${selectedAccount}/time-entries`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        // Reset form
        setSelectedTicket("");
        setSelectedAccount("");
        setMinutes("");
        setDescription("");
        setDate(new Date().toISOString().split('T')[0]);
        setTime(new Date().toTimeString().slice(0, 5));
        setNoCharge(false);
        setSelectedBillingRate("none");
        
        // Refresh data
        fetchTimeEntries();
        setActiveTab("entries");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create time entry");
      }
    } catch (error) {
      console.error('Failed to submit time entry:', error);
      alert("Failed to create time entry");
    }
  }, [
    minutes, description, date, time, entryType, selectedTicket, selectedAccount,
    noCharge, selectedBillingRate
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer functions are now handled globally by MultiTimerWidget - removed from this page


  // Show loading state while checking permissions and preferences
  if (status === "loading" || isLoading || permissionsLoading || preferencesLoading || permissionsCheckLoading || approvalPermissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Double-check authorization - this should rarely be reached due to useEffect redirect
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You must be logged in to access time tracking.</p>
        </div>
      </div>
    );
  }

  // Mock data removed - now using real API data


  // Timer functions removed - now handled by global MultiTimerWidget


  // Statistics are now calculated from real data in calculateStatistics()

  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    // Reset time to start of day for consistent date comparison
    entryDate.setHours(0, 0, 0, 0);
    const now = new Date();
    
    // Apply ticket filter
    if (filterTicket !== "all" && entry.ticketId !== filterTicket) {
      return false;
    }
    
    // Apply account filter
    if (filterAccount !== "all") {
      const entryAccountId = entry.accountId || entry.ticket?.account?.id;
      if (entryAccountId !== filterAccount) {
        return false;
      }
    }
    
    // Apply user filter
    if (filterUser !== "all" && entry.userId !== filterUser) {
      return false;
    }
    
    // Apply billing status filter
    if (filterBillingStatus !== "all") {
      if (filterBillingStatus === "billable" && entry.noCharge) {
        return false;
      }
      if (filterBillingStatus === "non-billable" && !entry.noCharge) {
        return false;
      }
    }
    
    // Apply approval status filter
    if (filterApprovalStatus !== "all") {
      if (filterApprovalStatus === "approved" && !entry.isApproved) {
        return false;
      }
      if (filterApprovalStatus === "pending" && entry.isApproved) {
        return false;
      }
    }
    
    // Apply invoice status filter
    if (filterInvoiceStatus !== "all") {
      const isInvoiced = entry.invoiceItems && entry.invoiceItems.length > 0;
      if (filterInvoiceStatus === "invoiced" && !isInvoiced) {
        return false;
      }
      if (filterInvoiceStatus === "not-invoiced" && isInvoiced) {
        return false;
      }
    }
    
    // Apply billing rate filter
    if (filterBillingRate !== "all" && entry.billingRateName !== filterBillingRate) {
      return false;
    }
    
    // Apply custom date range filter
    if (filterDateStart) {
      const startDate = new Date(filterDateStart);
      if (entryDate < startDate) {
        return false;
      }
    }
    if (filterDateEnd) {
      const endDate = new Date(filterDateEnd);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      if (entryDate > endDate) {
        return false;
      }
    }
    
    // Apply period filter (only if no custom date range is set)
    if (!filterDateStart && !filterDateEnd) {
      switch (filterPeriod) {
        case "today":
          return entryDate.toDateString() === now.toDateString();
        case "last7days":
          // Last 7 days (rolling window)
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 6); // 6 days ago + today = 7 days
          sevenDaysAgo.setHours(0, 0, 0, 0);
          return entryDate >= sevenDaysAgo;
        case "week":
          // Calculate start of week (Monday-based for business context)
          const startOfWeek = getStartOfWeek(now, true);
          // Week filter: include entries from Monday onwards
          return entryDate >= startOfWeek;
        case "month":
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return entryDate >= startOfMonth;
        default:
          return true;
      }
    }
    
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Time Management</h2>
            <p className="text-muted-foreground">
              Track time on tickets, manage entries, and view time reports.
            </p>
          </div>

          {/* Stats Cards - Role-Based Display */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics ? formatMinutes(statistics.todayMinutes) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Time logged today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics ? formatMinutes(statistics.weekMinutes) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Timer className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics ? formatMinutes(statistics.monthMinutes) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Time this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Billable Time
                </CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics ? formatMinutes(statistics.billableMinutes) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Billable last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entries">Time Entries</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {/* Time Entries Tab - Now first */}
            <TabsContent value="entries" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filter Time Entries
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const defaultFilters = {
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
                          
                          // Update state
                          setFilterPeriod(defaultFilters.filterPeriod);
                          setFilterTicket(defaultFilters.filterTicket);
                          setFilterAccount(defaultFilters.filterAccount);
                          setFilterUser(defaultFilters.filterUser);
                          setFilterBillingStatus(defaultFilters.filterBillingStatus);
                          setFilterApprovalStatus(defaultFilters.filterApprovalStatus);
                          setFilterInvoiceStatus(defaultFilters.filterInvoiceStatus);
                          setFilterBillingRate(defaultFilters.filterBillingRate);
                          setFilterDateStart(defaultFilters.filterDateStart);
                          setFilterDateEnd(defaultFilters.filterDateEnd);
                          setShowAdvancedFilters(defaultFilters.showAdvancedFilters);
                          
                          // Save to preferences immediately
                          updateTimePageFilters(defaultFilters);
                        }}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2"
                      >
                        Advanced Filters
                        {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Basic Filters - Always Visible */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="period-filter">Period</Label>
                        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="last7days">Last 7 Days</SelectItem>
                            <SelectItem value="week">This Week (Mon-Sun)</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="billing-status-filter">Billing Status</Label>
                        <Select value={filterBillingStatus} onValueChange={setFilterBillingStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Entries</SelectItem>
                            <SelectItem value="billable">Billable Only</SelectItem>
                            <SelectItem value="non-billable">Non-Billable Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="approval-status-filter">Approval Status</Label>
                        <Select value={filterApprovalStatus} onValueChange={setFilterApprovalStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Entries</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="pending">Pending Approval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoice-status-filter">Invoice Status</Label>
                        <Select value={filterInvoiceStatus} onValueChange={setFilterInvoiceStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Entries</SelectItem>
                            <SelectItem value="invoiced">Invoiced</SelectItem>
                            <SelectItem value="not-invoiced">Not Invoiced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Custom Date Range - Show when period is "custom" */}
                    {filterPeriod === "custom" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="date-start">Start Date</Label>
                          <Input
                            id="date-start"
                            type="date"
                            value={filterDateStart}
                            onChange={(e) => setFilterDateStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date-end">End Date</Label>
                          <Input
                            id="date-end"
                            type="date"
                            value={filterDateEnd}
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Advanced Filters - Collapsible */}
                    {showAdvancedFilters && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="ticket-filter">Ticket</Label>
                          <Select value={filterTicket} onValueChange={setFilterTicket}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Tickets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Tickets</SelectItem>
                              {tickets.map(ticket => (
                                <SelectItem key={ticket.id} value={ticket.id}>
                                  {ticket.ticketNumber} - {ticket.title.substring(0, 30)}{ticket.title.length > 30 ? '...' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="account-filter">Account</Label>
                          <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Accounts</SelectItem>
                              {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} ({account.accountType})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="user-filter">User</Label>
                          <Select value={filterUser} onValueChange={setFilterUser}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billing-rate-filter">Billing Rate</Label>
                          <Select value={filterBillingRate} onValueChange={setFilterBillingRate}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Rates" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Rates</SelectItem>
                              {billingRates.map(rate => (
                                <SelectItem key={rate.name} value={rate.name}>
                                  {rate.name} - ${rate.rate}/hr
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Active Filters Summary */}
                    {(filterBillingStatus !== "all" || filterApprovalStatus !== "all" || filterInvoiceStatus !== "all" || filterTicket !== "all" || filterAccount !== "all" || filterUser !== "all" || filterBillingRate !== "all" || filterDateStart || filterDateEnd) && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-2 block">Active Filters:</Label>
                        <div className="flex flex-wrap gap-2">
                      {filterBillingStatus !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {filterBillingStatus === "billable" ? "Billable Only" : "Non-Billable Only"}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterBillingStatus("all")} />
                        </Badge>
                      )}
                      {filterApprovalStatus !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {filterApprovalStatus === "approved" ? "Approved" : "Pending"}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterApprovalStatus("all")} />
                        </Badge>
                      )}
                      {filterInvoiceStatus !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {filterInvoiceStatus === "invoiced" ? "Invoiced" : "Not Invoiced"}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterInvoiceStatus("all")} />
                        </Badge>
                      )}
                      {filterTicket !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Ticket: {tickets.find(t => t.id === filterTicket)?.ticketNumber}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterTicket("all")} />
                        </Badge>
                      )}
                      {filterAccount !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Account: {accounts.find(a => a.id === filterAccount)?.name}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterAccount("all")} />
                        </Badge>
                      )}
                      {filterUser !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          User: {users.find(u => u.id === filterUser)?.name}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterUser("all")} />
                        </Badge>
                      )}
                      {filterBillingRate !== "all" && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Rate: {filterBillingRate}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterBillingRate("all")} />
                        </Badge>
                      )}
                      {(filterDateStart || filterDateEnd) && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          Custom Range: {filterDateStart || 'Start'} to {filterDateEnd || 'End'}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => { setFilterDateStart(""); setFilterDateEnd(""); setFilterPeriod("last7days"); }} />
                        </Badge>
                      )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Filter Results Summary */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredEntries.length} of {timeEntries.length} time entries
                  {filteredEntries.length !== timeEntries.length && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({timeEntries.length - filteredEntries.length} filtered out)
                    </span>
                  )}
                </div>
                {filteredEntries.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Total time: {formatMinutes(filteredEntries.reduce((sum, entry) => sum + entry.minutes, 0))}
                  </div>
                )}
              </div>

              {/* Time Entries List */}
              <div className="space-y-4">
                {filteredEntries.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        No time entries match the selected filters.
                      </p>
                      <Button onClick={() => setActiveTab("manual")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Log Your First Entry
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredEntries.map((entry) => {
                    const permissions = timeEntryPermissions.get(entry.id) || { canEdit: false, canDelete: false };
                    return (
                      <TimeEntryCard
                        key={entry.id}
                        entry={entry}
                        showBillingAmount={showBillingRates}
                        permissions={permissions}
                        onEdit={handleEditEntry}
                        onDelete={handleDeleteEntry}
                      />
                    );
                  })
                )}
              </div>

              {/* Summary */}
              {filteredEntries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-4 text-center ${showBillingRates ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatMinutes(filteredEntries.reduce((sum, entry) => sum + entry.minutes, 0))}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Time</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatMinutes(filteredEntries.filter(entry => !entry.noCharge).reduce((sum, entry) => sum + entry.minutes, 0))}
                        </div>
                        <div className="text-sm text-muted-foreground">Billable Time</div>
                      </div>
                      {showBillingRates && (
                        <div>
                          <div className="text-2xl font-bold text-orange-600">
                            ${filteredEntries.filter(entry => !entry.noCharge && entry.billingRateValue).reduce((sum, entry) => sum + ((entry.minutes / 60) * (entry.billingRateValue || 0)), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">Billable Amount</div>
                        </div>
                      )}
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {filteredEntries.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Entries</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Time Entry</CardTitle>
                  <CardDescription>
                    Log time manually for tickets and tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Entry Type Selection */}
                  <div className="space-y-3">
                    <Label>Time Entry Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          entryType === "ticket"
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-border'
                        }`}
                        onClick={() => setEntryType("ticket")}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium text-sm">Ticket</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Log time against a specific ticket</p>
                      </div>
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          entryType === "account"
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-border'
                        }`}
                        onClick={() => setEntryType("account")}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Building className="h-4 w-4" />
                          <span className="font-medium text-sm">Account</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Log time directly to an account</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entryType === "ticket" ? (
                      <div className="space-y-2">
                        <Label htmlFor="ticket-select">Ticket</Label>
                        <TicketSelector
                          tickets={tickets}
                          value={selectedTicket}
                          onValueChange={setSelectedTicket}
                          placeholder="Select a ticket"
                          enableFilters={true}
                          enableGrouping={true}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="account-select">Account</Label>
                        <AccountSelector
                          accounts={accounts}
                          value={selectedAccount}
                          onValueChange={setSelectedAccount}
                          placeholder="Select an account"
                          enableFilters={true}
                          enableGrouping={true}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="minutes-input">Minutes *</Label>
                      <Input
                        id="minutes-input"
                        type="number"
                        step="15"
                        min="0"
                        max="1440"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        placeholder="120"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-input">Date *</Label>
                      <Input
                        id="date-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time-input">Start Time *</Label>
                      <Input
                        id="time-input"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        What time did you start working?
                      </p>
                    </div>

                    {/* Billing Rate - Only visible to users with BILLING.VIEW permission */}
                    {showBillingRates && (
                      <div className="space-y-2">
                        <Label htmlFor="billing-rate">Billing Rate</Label>
                        <Select value={selectedBillingRate} onValueChange={setSelectedBillingRate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select billing rate (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No billing rate</SelectItem>
                            {billingRates.map(rate => (
                              <SelectItem key={rate.id} value={rate.id}>
                                {rate.name} - ${rate.rate}/hr
                                {rate.description && (
                                  <span className="text-muted-foreground ml-1">
                                    ({rate.description})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="no-charge"
                        checked={noCharge}
                        onCheckedChange={setNoCharge}
                      />
                      <Label htmlFor="no-charge">No Charge</Label>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="description-input">Description *</Label>
                    <Textarea
                      id="description-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the work performed..."
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitTimeEntry}
                    disabled={
                      !minutes || 
                      !description.trim() || 
                      !date ||
                      !time ||
                      (entryType === "ticket" && !selectedTicket) || 
                      (entryType === "account" && !selectedAccount)
                    }
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Log Time Entry
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

      {/* Dialogs */}
      <TimeEntryEditDialog
        timeEntry={selectedTimeEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          fetchTimeEntries();
          setSelectedTimeEntry(null);
        }}
      />

      <TimeEntryApprovalWizard
        open={approvalWizardOpen}
        onOpenChange={setApprovalWizardOpen}
        onSuccess={() => {
          fetchTimeEntries();
        }}
      />
    </div>
  );
}