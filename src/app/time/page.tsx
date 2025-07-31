"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Clock, 
  Plus, 
  Play, 
  Pause, 
  Square,
  LogOut, 
  Settings, 
  ArrowLeft,
  Calendar,
  Timer,
  DollarSign,
  Edit,
  Trash2,
  Building,
  User,
  FileText
} from "lucide-react";

export default function TimeTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("track");
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentTicket, setCurrentTicket] = useState<string>("");
  
  // Form state
  const [entryType, setEntryType] = useState<"ticket" | "account">("ticket");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [noCharge, setNoCharge] = useState(false);
  
  // Data state
  const [accounts, setAccounts] = useState<Array<{id: string; name: string; accountType: string}>>([]);

  // Filter state
  const [filterPeriod, setFilterPeriod] = useState("week");
  const [filterTicket, setFilterTicket] = useState("all");

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only employees and admins can access time tracking
      const role = session.user?.role;
      if (role !== "EMPLOYEE" && role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
        fetchAccounts();
      }
    }
  }, [status, session, router]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== "EMPLOYEE" && session.user?.role !== "ADMIN")) {
    return null;
  }

  // Mock data - will be replaced with real data from database
  const tickets = [
    { id: "T-001", title: "Fix login issue", customer: "Example Corp" },
    { id: "T-002", title: "Database optimization", customer: "Tech Solutions" },
    { id: "T-003", title: "UI improvements", customer: "StartupXYZ" },
  ];

  const timeEntries = [
    {
      id: "1",
      ticketId: "T-001",
      ticketTitle: "Fix login issue",
      customer: "Example Corp",
      description: "Initial investigation of login issue",
      hours: 2.5,
      date: "2024-01-26",
      user: "John Doe",
      noCharge: false,
      rate: 75.00
    },
    {
      id: "2",
      ticketId: "T-001",
      ticketTitle: "Fix login issue",
      customer: "Example Corp",
      description: "Implementing authentication fix",
      hours: 4.0,
      date: "2024-01-25",
      user: "John Doe",
      noCharge: false,
      rate: 75.00
    },
    {
      id: "3",
      ticketId: "T-002",
      ticketTitle: "Database optimization",
      customer: "Tech Solutions",
      description: "Query performance analysis",
      hours: 3.5,
      date: "2024-01-24",
      user: "Jane Smith",
      noCharge: true,
      rate: 75.00
    },
  ];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    if (currentTicket) {
      setIsTimerRunning(true);
    }
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if (timerSeconds > 0 && currentTicket) {
      // Convert seconds to hours and populate manual entry form
      const timerHours = (timerSeconds / 3600).toFixed(2);
      setSelectedTicket(currentTicket);
      setHours(timerHours);
      setActiveTab("manual");
    }
    setTimerSeconds(0);
    setCurrentTicket("");
  };

  const handleSubmitTimeEntry = async () => {
    try {
      const payload = {
        ticketId: entryType === "ticket" ? selectedTicket : null,
        accountId: entryType === "account" ? selectedAccount : null,
        hours: parseFloat(hours),
        description,
        date,
        noCharge
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
        setHours("");
        setDescription("");
        setDate(new Date().toISOString().split('T')[0]);
        setNoCharge(false);
        
        // Show success message (you could add a toast here)
        console.log("Time entry created successfully");
      } else {
        const errorData = await response.json();
        console.error("Failed to create time entry:", errorData.error);
        // Show error message (you could add a toast here)
      }
    } catch (error) {
      console.error("Error creating time entry:", error);
      // Show error message (you could add a toast here)
    }
  };

  const stats = {
    todayHours: 8.5,
    weekHours: 32.5,
    monthHours: 142.0,
    billableHours: 28.5
  };

  const filteredEntries = timeEntries.filter(entry => {
    // Apply filters (simplified for demo)
    return filterTicket === "all" || entry.ticketId === filterTicket;
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

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayHours}h</div>
                <p className="text-xs text-muted-foreground">Hours logged today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.weekHours}h</div>
                <p className="text-xs text-muted-foreground">Hours this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Timer className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.monthHours}h</div>
                <p className="text-xs text-muted-foreground">Hours this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.billableHours}h</div>
                <p className="text-xs text-muted-foreground">Billable this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="track">Timer</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="entries">Time Entries</TabsTrigger>
            </TabsList>

            {/* Timer Tab */}
            <TabsContent value="track" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Time Tracker</CardTitle>
                  <CardDescription>
                    Start a timer to track time in real-time on a specific ticket.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Timer Display */}
                  <div className="text-center">
                    <div className="text-6xl font-mono font-bold mb-4">
                      {formatTime(timerSeconds)}
                    </div>
                    {currentTicket && (
                      <div className="text-sm text-muted-foreground mb-4">
                        Tracking time for: <strong>{currentTicket}</strong>
                      </div>
                    )}
                  </div>

                  {/* Ticket Selection */}
                  {!isTimerRunning && (
                    <div className="space-y-2">
                      <Label htmlFor="timer-ticket">Select Ticket</Label>
                      <Select value={currentTicket} onValueChange={setCurrentTicket}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a ticket to track time on" />
                        </SelectTrigger>
                        <SelectContent>
                          {tickets.map(ticket => (
                            <SelectItem key={ticket.id} value={ticket.id}>
                              {ticket.id} - {ticket.title} ({ticket.customer})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Timer Controls */}
                  <div className="flex justify-center space-x-2">
                    {!isTimerRunning ? (
                      <Button 
                        onClick={handleStartTimer} 
                        disabled={!currentTicket}
                        size="lg"
                        className="min-w-[120px]"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={handlePauseTimer}
                          variant="outline"
                          size="lg"
                          className="min-w-[120px]"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                        <Button 
                          onClick={handleStopTimer}
                          variant="destructive"
                          size="lg"
                          className="min-w-[120px]"
                        >
                          <Square className="mr-2 h-4 w-4" />
                          Stop & Log
                        </Button>
                      </>
                    )}
                  </div>

                  {timerSeconds > 0 && !isTimerRunning && (
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Timer stopped. Click &quot;Stop & Log&quot; to create a time entry with the tracked time.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entryType === "ticket" ? (
                      <div className="space-y-2">
                        <Label htmlFor="ticket-select">Ticket</Label>
                        <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {tickets.map(ticket => (
                              <SelectItem key={ticket.id} value={ticket.id}>
                                {ticket.id} - {ticket.title} ({ticket.customer})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="account-select">Account</Label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex items-center space-x-2">
                                  {account.accountType === "INDIVIDUAL" ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Building className="h-4 w-4" />
                                  )}
                                  <span>{account.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="hours-input">Hours</Label>
                      <Input
                        id="hours-input"
                        type="number"
                        step="0.25"
                        min="0"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="2.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-input">Date</Label>
                      <Input
                        id="date-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="no-charge"
                        checked={noCharge}
                        onCheckedChange={setNoCharge}
                      />
                      <Label htmlFor="no-charge">No Charge</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description-input">Description</Label>
                    <Textarea
                      id="description-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the work performed..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitTimeEntry}
                    disabled={
                      !hours || 
                      !description || 
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

            {/* Time Entries Tab */}
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
                              {ticket.id} - {ticket.title}
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
                    <Card key={entry.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{entry.ticketId}</Badge>
                              <span className="font-medium">{entry.ticketTitle}</span>
                              {entry.noCharge && (
                                <Badge variant="secondary">No Charge</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {entry.customer}
                            </p>
                            
                            <p className="text-sm">{entry.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{entry.date}</span>
                              <span>{entry.user}</span>
                              <span className="font-medium">{entry.hours}h</span>
                              {!entry.noCharge && (
                                <span>${(entry.hours * entry.rate).toFixed(2)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)}h
                        </div>
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {filteredEntries.filter(entry => !entry.noCharge).reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)}h
                        </div>
                        <div className="text-sm text-muted-foreground">Billable Hours</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          ${filteredEntries.filter(entry => !entry.noCharge).reduce((sum, entry) => sum + (entry.hours * entry.rate), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Billable Amount</div>
                      </div>
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}