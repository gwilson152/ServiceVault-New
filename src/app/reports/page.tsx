"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  LogOut, 
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  FileText,
  Calendar,
  Download,
  Filter,
  Building,
  PieChart,
  LineChart
} from "lucide-react";

interface ReportStats {
  accounts: {
    total: number;
    active: number;
    organizations: number;
    individuals: number;
    subsidiaries: number;
  };
  timeTracking: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    averageHoursPerDay: number;
  };
  financial: {
    totalRevenue: number;
    pendingInvoices: number;
    paidInvoices: number;
    averageInvoiceValue: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    averageResolutionTime: number;
  };
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [stats, setStats] = useState<ReportStats>({
    accounts: {
      total: 0,
      active: 0,
      organizations: 0,
      individuals: 0,
      subsidiaries: 0,
    },
    timeTracking: {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      averageHoursPerDay: 0,
    },
    financial: {
      totalRevenue: 0,
      pendingInvoices: 0,
      paidInvoices: 0,
      averageInvoiceValue: 0,
    },
    tickets: {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      averageResolutionTime: 0,
    },
  });

  const fetchReportData = async () => {
    try {
      // For now, we'll use mock data. In a real implementation, this would call various API endpoints
      // to gather statistics from different parts of the system
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        accounts: {
          total: 8,
          active: 6,
          organizations: 3,
          individuals: 4,
          subsidiaries: 1,
        },
        timeTracking: {
          totalHours: 342.5,
          billableHours: 298.0,
          nonBillableHours: 44.5,
          averageHoursPerDay: 6.8,
        },
        financial: {
          totalRevenue: 24750.00,
          pendingInvoices: 3,
          paidInvoices: 12,
          averageInvoiceValue: 1650.00,
        },
        tickets: {
          total: 45,
          open: 8,
          inProgress: 12,
          resolved: 25,
          averageResolutionTime: 2.3,
        },
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE") {
        router.push("/dashboard");
      } else {
        fetchReportData();
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (!isLoading) {
      fetchReportData();
    }
  }, [dateRange]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE")) {
    return null;
  }

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
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Reports & Analytics</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            {/* Date Range Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>

            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">{session.user?.role}</Badge>
            
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
            <h2 className="text-2xl font-bold tracking-tight">Business Analytics</h2>
            <p className="text-muted-foreground">
              Comprehensive insights into your business performance and metrics.
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.financial.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.timeTracking.billableHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.timeTracking.billableHours / stats.timeTracking.totalHours) * 100).toFixed(1)}% of total hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.accounts.active}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.accounts.total} total accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tickets.open}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.tickets.inProgress} in progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Report Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="time">Time & Productivity</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="tickets">Tickets & Service</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Health</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Revenue Growth</span>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-600">+12%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Client Satisfaction</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">92%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Utilization Rate</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {((stats.timeTracking.billableHours / stats.timeTracking.totalHours) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avg. Resolution Time</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{stats.tickets.averageResolutionTime} days</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common reporting tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Generate Monthly Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export Time Entries
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Financial Summary
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      Client Performance Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Distribution</CardTitle>
                    <CardDescription>By account type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span className="text-sm">Organizations</span>
                        </div>
                        <span className="font-medium">{stats.accounts.organizations}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">Individuals</span>
                        </div>
                        <span className="font-medium">{stats.accounts.individuals}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Subsidiaries</span>
                        </div>
                        <span className="font-medium">{stats.accounts.subsidiaries}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Performance</CardTitle>
                    <CardDescription>Top performing accounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <PieChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Account Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Detailed account performance charts and metrics coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Growth</CardTitle>
                    <CardDescription>New accounts over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <LineChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Growth Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Account growth trends and projections coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Time & Productivity Tab */}
            <TabsContent value="time" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Time Distribution</CardTitle>
                    <CardDescription>Hours breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Hours</span>
                        <span className="font-medium">{stats.timeTracking.totalHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Billable Hours</span>
                        <span className="font-medium text-green-600">{stats.timeTracking.billableHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Non-billable Hours</span>
                        <span className="font-medium text-orange-600">{stats.timeTracking.nonBillableHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avg. Hours/Day</span>
                        <span className="font-medium">{stats.timeTracking.averageHoursPerDay.toFixed(1)}h</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Productivity Trends</CardTitle>
                    <CardDescription>Time tracking analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Time Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Detailed time tracking charts and productivity metrics coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                    <CardDescription>Financial performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Revenue</span>
                        <span className="font-medium">${stats.financial.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Paid Invoices</span>
                        <span className="font-medium text-green-600">{stats.financial.paidInvoices}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pending Invoices</span>
                        <span className="font-medium text-orange-600">{stats.financial.pendingInvoices}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avg. Invoice Value</span>
                        <span className="font-medium">${stats.financial.averageInvoiceValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Financial Trends</CardTitle>
                    <CardDescription>Revenue and billing analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Financial Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Revenue trends, billing analytics, and financial projections coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tickets & Service Tab */}
            <TabsContent value="tickets" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Statistics</CardTitle>
                    <CardDescription>Support ticket metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Tickets</span>
                        <span className="font-medium">{stats.tickets.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Open Tickets</span>
                        <span className="font-medium text-orange-600">{stats.tickets.open}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">In Progress</span>
                        <span className="font-medium text-blue-600">{stats.tickets.inProgress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Resolved</span>
                        <span className="font-medium text-green-600">{stats.tickets.resolved}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avg. Resolution Time</span>
                        <span className="font-medium">{stats.tickets.averageResolutionTime} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Service Performance</CardTitle>
                    <CardDescription>Support quality metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Service Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Ticket trends, resolution analytics, and service quality metrics coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}