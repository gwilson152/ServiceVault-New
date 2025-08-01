"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
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
import { usePermissions, useTimeEntryPermissions } from "@/hooks/usePermissions";
import { useActionBar } from "@/components/providers/ActionBarProvider";
import { ActionBar } from "@/components/ui/ActionBar";
import { formatMinutes } from "@/lib/time-utils";
import { 
  Clock, 
  Plus, 
  LogOut, 
  Settings, 
  ArrowLeft,
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
  Users
} from "lucide-react";

export default function TimeTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entries");
  
  // Permission hooks
  const {
    canViewTimeEntries,
    canCreateTimeEntries,
    canApproveTimeEntries,
    canViewBilling,
    canViewReports,
    isLoading: permissionsLoading
  } = usePermissions();
  
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

  // Filter state
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [filterTicket, setFilterTicket] = useState("all");
  
  // Permission-based visibility
  const [showBillingRates, setShowBillingRates] = useState(false);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchBillingRates = async () => {
    try {
      const response = await fetch('/api/billing/rates');
      if (response.ok) {
        const data = await response.json();
        setBillingRates(data || []);
      }
    } catch (error) {
      console.error('Error fetching billing rates:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchTimeEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Role-based filtering: EMPLOYEE users only see their own entries
      if (session?.user?.role === 'EMPLOYEE') {
        params.append('userId', session.user.id);
      }
      // ADMIN users see all entries (no userId filter)
      
      // Apply additional filters
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
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const todayMinutes = entries
          .filter((entry: any) => new Date(entry.date).toDateString() === today)
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        const weekMinutes = entries
          .filter((entry: any) => new Date(entry.date) >= startOfWeek)
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        const monthMinutes = entries
          .filter((entry: any) => new Date(entry.date) >= startOfMonth)
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        const billableEntries = entries.filter((entry: any) => !entry.noCharge);
        const billableMinutes = billableEntries
          .filter((entry: any) => new Date(entry.date) >= startOfWeek)
          .reduce((sum: number, entry: any) => sum + entry.minutes, 0);
        
        // Calculate billable amount (only for ADMIN users)
        let billableAmount = undefined;
        if (session?.user?.role === 'ADMIN') {
          billableAmount = billableEntries
            .filter((entry: any) => new Date(entry.date) >= startOfWeek)
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
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  }, [session?.user?.role, session?.user?.id, filterTicket]);

  // calculateStatistics function moved inline to fetchTimeEntries to avoid circular dependency

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && !permissionsLoading) {
      // Check if user has permission to view time entries
      const checkAccess = async () => {
        const hasAccess = await canViewTimeEntries();
        if (!hasAccess) {
          console.log(`Access denied to /time page for user: ${session.user?.email}. Redirecting to dashboard.`);
          router.push("/dashboard");
          return;
        }
        
        console.log(`Access granted to /time page for user: ${session.user?.email}`);
        setIsLoading(false);
        
        // Check billing permissions
        const billingPermission = await canViewBilling();
        setShowBillingRates(billingPermission);
        
        // Setup action bar actions
        const approvalPermission = await canApproveTimeEntries();
        if (approvalPermission) {
          addAction({
            id: "approval-wizard",
            label: "Approval Wizard",
            icon: <Users className="h-4 w-4" />,
            onClick: () => setApprovalWizardOpen(true),
            variant: "secondary",
            tooltip: "Review and approve pending time entries"
          });
        }
        
        fetchAccounts();
        fetchBillingRates();
        fetchTickets();
        fetchTimeEntries();
      };
      
      checkAccess();
    }
  }, [status, session?.user?.email, router, permissionsLoading]);

  // Cleanup actions when component unmounts
  useEffect(() => {
    return () => {
      clearActions();
    };
  }, []);

  // Register for timer logged events to auto-refresh data
  useEffect(() => {
    const unregisterCallback = registerTimerLoggedCallback(() => {
      console.log('Timer logged - refreshing time entries and statistics');
      fetchTimeEntries(); // Refresh time entries which will also recalculate statistics
    });

    return unregisterCallback;
  }, [registerTimerLoggedCallback, fetchTimeEntries]);

  // Refresh time entries when filters change
  useEffect(() => {
    if (session?.user && !isLoading) {
      fetchTimeEntries();
    }
  }, [filterTicket, session?.user, isLoading, fetchTimeEntries]);

  // Timer functions are now handled globally by MultiTimerWidget - removed from this page


  // Show loading state while checking permissions
  if (status === "loading" || isLoading || permissionsLoading) {
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

  const handleEditEntry = (entry: any) => {
    setSelectedTimeEntry(entry);
    setEditDialogOpen(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this time entry? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTimeEntries();
      } else {
        const errorData = await response.json();
        alert("Failed to delete time entry: " + errorData.error);
      }
    } catch (error) {
      console.error("Error deleting time entry:", error);
      alert("Failed to delete time entry");
    }
  };

  const handleOpenApprovalWizard = async () => {
    const hasApprovalPermission = await canApproveTimeEntries();
    if (hasApprovalPermission) {
      setApprovalWizardOpen(true);
    } else {
      alert("You do not have permission to approve time entries.");
    }
  };

  const handleSubmitTimeEntry = async () => {
    // Validation
    if (!minutes || !description.trim() || !date || !time) {
      alert("Please fill in all required fields (minutes, description, date, and time)");
      return;
    }

    if ((entryType === "ticket" && !selectedTicket) || (entryType === "account" && !selectedAccount)) {
      alert("Please select a ticket or account");
      return;
    }

    try {
      const payload = {
        ticketId: entryType === "ticket" ? selectedTicket : null,
        accountId: entryType === "account" ? selectedAccount : null,
        minutes: parseInt(minutes),
        description,
        date,
        time,
        noCharge,
        billingRateId: selectedBillingRate === "none" ? null : selectedBillingRate
      };

      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
        
        // Refresh data to show new entry
        await fetchTimeEntries();
        
        console.log("Time entry created successfully");
      } else {
        const errorData = await response.json();
        console.error("Failed to create time entry:", errorData.error);
        alert("Failed to create time entry: " + errorData.error);
      }
    } catch (error) {
      console.error("Error creating time entry:", error);
      // Show error message (you could add a toast here)
    }
  };

  // Statistics are now calculated from real data in calculateStatistics()

  const filteredEntries = timeEntries.filter(entry => {
    // Apply ticket filter
    if (filterTicket !== "all" && entry.ticketId !== filterTicket) {
      return false;
    }
    
    // Apply period filter (basic implementation)
    const entryDate = new Date(entry.date);
    const now = new Date();
    
    switch (filterPeriod) {
      case "today":
        return entryDate.toDateString() === now.toDateString();
      case "week":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return entryDate >= startOfWeek;
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return entryDate >= startOfMonth;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Time Tracking</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            {/* Action Bar */}
            <ActionBar />
            
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">{session.user?.role}</Badge>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
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
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics ? formatMinutes(statistics.weekMinutes) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Time this week</p>
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
                  Billable this week
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
                  <CardTitle className="text-lg">Filter Time Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="period-filter">Period</Label>
                      <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticket-filter">Ticket</Label>
                      <Select value={filterTicket} onValueChange={setFilterTicket}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tickets</SelectItem>
                          {tickets.map(ticket => (
                            <SelectItem key={ticket.id} value={ticket.id}>
                              {ticket.ticketNumber} - {ticket.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                  filteredEntries.map((entry) => (
                    <TimeEntryCard
                      key={entry.id}
                      entry={entry}
                      showBillingAmount={showBillingRates}
                      onEdit={handleEditEntry}
                      onDelete={handleDeleteEntry}
                    />
                  ))
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
      </main>

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