"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Account } from "@/components/selectors/account-selector";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  accountId: string;
  assigneeId?: string;
  createdAt: string;
  customFields?: Record<string, unknown>;
  account?: Account;
  assignee?: User;
  totalTimeSpent: number;
  totalAddonCost: number;
  timeEntriesCount: number;
  addonsCount: number;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountSelector } from "@/components/selectors/account-selector";
import { TicketDetailModal } from "@/components/tickets/TicketDetailModal";
import { QuickTimeEntry } from "@/components/time/QuickTimeEntry";
import { QuickAddonEntry } from "@/components/tickets/QuickAddonEntry";
import { useTimeTracking } from "@/components/time/TimeTrackingProvider";
import { 
  FileText, 
  Plus, 
  Settings, 
  LogOut, 
  ArrowLeft,
  Users,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  Search,
  X
} from "lucide-react";
import { formatMinutes } from "@/lib/time-utils";

export default function TicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { registerTimerLoggedCallback } = useTimeTracking();

  // Data state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customFields, setCustomFields] = useState<Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
  }>>([]);


  // Filter state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [searchText, setSearchText] = useState("");

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Data fetching functions
  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts/all");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users/employees");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const response = await fetch("/api/settings?category=SYSTEM");
      if (response.ok) {
        const data = await response.json();
        // Look for ticket custom fields in system settings
        const ticketFieldsData = data["system.ticketCustomFields"];
        if (ticketFieldsData && Array.isArray(ticketFieldsData)) {
          setCustomFields(ticketFieldsData);
        }
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Handle different user roles
      const role = session.user?.role;
      if (role === "ACCOUNT_USER") {
        // Account users can view tickets but with restricted access
        Promise.all([fetchTickets(), fetchAccounts(), fetchUsers(), fetchCustomFields()]).then(() => {
          setIsLoading(false);
        });
      } else if (role === "EMPLOYEE" || role === "ADMIN") {
        // Employees and admins have full access
        Promise.all([fetchTickets(), fetchAccounts(), fetchUsers(), fetchCustomFields()]).then(() => {
          setIsLoading(false);
        });
      } else {
        // Other roles redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  // Register for timer logged events to auto-refresh tickets
  useEffect(() => {
    const unregisterCallback = registerTimerLoggedCallback(() => {
      console.log("🟢 [TicketsPage] Timer logged callback triggered - refreshing tickets");
      // Refresh tickets when any timer is logged
      fetchTickets();
    });

    return unregisterCallback;
  }, [registerTimerLoggedCallback]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = session.user?.role;
  const isAdmin = userRole === "ADMIN";
  const isEmployee = userRole === "EMPLOYEE";
  const canCreateTickets = isAdmin || isEmployee;
  const canEditAllTickets = isAdmin || isEmployee;

  const handleCreateTicket = () => {
    setSelectedTicket(null);
    setIsCreateMode(true);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "OPEN": return "destructive";
      case "IN_PROGRESS": return "default";
      case "RESOLVED": return "outline";
      case "CLOSED": return "secondary";
      default: return "secondary";
    }
  };

  const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case "HIGH": return "destructive";
      case "MEDIUM": return "default";
      case "LOW": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <AlertCircle className="h-4 w-4" />;
      case "IN_PROGRESS": return <Clock className="h-4 w-4" />;
      case "RESOLVED": return <CheckCircle className="h-4 w-4" />;
      case "CLOSED": return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    setIsCreateMode(false);
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
  };

  const handleCreateComplete = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
    setIsCreateMode(false);
  };

  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false;
    
    // Account filter
    if (filterAccount !== "all" && ticket.accountId !== filterAccount) return false;
    
    // Priority filter
    if (filterPriority !== "all" && ticket.priority !== filterPriority) return false;
    
    // Assignee filter
    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned" && ticket.assigneeId) return false;
      if (filterAssignee !== "unassigned" && ticket.assigneeId !== filterAssignee) return false;
    }
    
    // Text search (title and description)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const titleMatch = ticket.title.toLowerCase().includes(searchLower);
      const descMatch = ticket.description.toLowerCase().includes(searchLower);
      const numberMatch = ticket.ticketNumber.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch && !numberMatch) return false;
    }
    
    return true;
  });

  const stats = {
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === "OPEN").length,
    inProgressTickets: tickets.filter(t => t.status === "IN_PROGRESS").length,
    resolvedTickets: tickets.filter(t => t.status === "RESOLVED").length
  };

  const renderCustomFieldValue = (ticket: Ticket, field: { name: string; label: string; type: string; required?: boolean; options?: string[] }) => {
    const value = ticket.customFields?.[field.name];
    if (!value) return null;
    
    return (
      <span className="text-sm text-muted-foreground">
        <strong>{field.label}:</strong> {value}
      </span>
    );
  };


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
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Ticket Management</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">{session.user?.role}</Badge>
            
            {canCreateTickets && (
              <Button onClick={handleCreateTicket}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            )}
            
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
            <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
            <p className="text-muted-foreground">
              Manage customer support tickets, track progress, and assign work.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTickets}</div>
                <p className="text-xs text-muted-foreground">All tickets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.openTickets}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
                <p className="text-xs text-muted-foreground">Being worked on</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolvedTickets}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg">Filter Tickets</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterAccount("all");
                      setFilterPriority("all");
                      setFilterAssignee("all");
                      setSearchText("");
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="space-y-2">
                      <Label htmlFor="search-input">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search-input"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder="Search tickets by title, description, or number..."
                          className="pl-10"
                        />
                        {searchText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setSearchText("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filter Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status-filter">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account-filter">Account</Label>
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority-filter">Priority</Label>
                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="assignee-filter">Assignee</Label>
                        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Assignees</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Active Filters Display */}
                    {(filterStatus !== "all" || filterAccount !== "all" || filterPriority !== "all" || filterAssignee !== "all" || searchText) && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                        {searchText && (
                          <Badge variant="secondary" className="gap-1">
                            Search: {searchText}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => setSearchText("")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        {filterStatus !== "all" && (
                          <Badge variant="secondary" className="gap-1">
                            Status: {filterStatus}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => setFilterStatus("all")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        {filterAccount !== "all" && (
                          <Badge variant="secondary" className="gap-1">
                            Account: {accounts.find(a => a.id === filterAccount)?.name || filterAccount}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => setFilterAccount("all")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        {filterPriority !== "all" && (
                          <Badge variant="secondary" className="gap-1">
                            Priority: {filterPriority}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => setFilterPriority("all")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                        {filterAssignee !== "all" && (
                          <Badge variant="secondary" className="gap-1">
                            Assignee: {filterAssignee === "unassigned" ? "Unassigned" : users.find(u => u.id === filterAssignee)?.name || filterAssignee}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => setFilterAssignee("all")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tickets List */}
              <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        No tickets match the selected filters.
                      </p>
                      {canCreateTickets && (
                        <Button onClick={handleCreateTicket}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Ticket
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              <span className="font-medium text-lg">{ticket.ticketNumber}</span>
                              <Badge variant={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                              <Badge variant={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            
                            <h3 className="text-xl font-semibold">{ticket.title}</h3>
                            <p className="text-muted-foreground">{ticket.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span><Users className="inline h-3 w-3 mr-1" />{ticket.account?.name}</span>
                              {ticket.assignee && (
                                <span>Assigned to: {ticket.assignee.name}</span>
                              )}
                              <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatMinutes(ticket.totalTimeSpent)} ({ticket.timeEntriesCount} entries)
                              </span>
                              {ticket.totalAddonCost > 0 && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${ticket.totalAddonCost.toFixed(2)} ({ticket.addonsCount} addons)
                                </span>
                              )}
                            </div>

                            {/* Custom Fields Display */}
                            {ticket.customFields && Object.keys(ticket.customFields).length > 0 && (
                              <div className="flex flex-wrap gap-4">
                                {customFields.map((field) => (
                                  renderCustomFieldValue(ticket, field)
                                )).filter(Boolean)}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View details"
                              onClick={() => handleViewTicket(ticket)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditAllTickets && (
                              <>
                                <QuickTimeEntry
                                  ticketId={ticket.id}
                                  ticketTitle={ticket.title}
                                  onTimeLogged={() => fetchTickets()}
                                />
                                <QuickAddonEntry
                                  ticketId={ticket.id}
                                  ticketTitle={ticket.title}
                                  onAddonAdded={() => fetchTickets()}
                                />
                                <Button variant="ghost" size="sm" title="Edit ticket">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isAdmin && (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" title="Delete ticket">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
          </div>
        </div>
      </main>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdateTicket}
        onCreate={handleCreateComplete}
        canEdit={canEditAllTickets}
        accounts={accounts}
        users={users}
        customFields={customFields}
        isCreateMode={isCreateMode}
      />
    </div>
  );
}