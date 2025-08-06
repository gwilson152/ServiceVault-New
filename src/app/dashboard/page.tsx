/**
 * DASHBOARD PAGE
 * 
 * Purpose: Main landing page showing system overview and key metrics for all authenticated users
 * Access: All authenticated users (ADMIN, EMPLOYEE, ACCOUNT_USER with role-specific content)
 * 
 * Key Functions:
 * - Display role-appropriate statistics (active tickets, time tracking, revenue metrics)
 * - Show recent activity including tickets and time entries
 * - Provide quick access navigation to main workflow areas
 * - Role-based content filtering (ACCOUNT_USER sees limited data)
 * 
 * Related Pages:
 * - /tickets - Ticket management (quick ticket creation actions)
 * - /time - Time tracking (recent time entries display)
 * - /accounts - Account management (total accounts statistic)
 * - /billing - Financial overview (revenue statistics for ADMIN/EMPLOYEE)
 * - /portal - ACCOUNT_USER users are redirected to portal instead
 * 
 * API Dependencies:
 * - GET /api/dashboard/stats - Main dashboard statistics (role-filtered)
 * - GET /api/tickets?recent=true - Recent tickets list
 * - GET /api/time-entries?recent=true - Recent time entries (via RecentTimeEntries component)
 * 
 * Components Used:
 * - RecentTimeEntries - Display recent time tracking activity
 * - Stats Cards - Metric display with icons and descriptions
 * - Activity Feed - Recent system activity display
 * 
 * State Management:
 * - Local state for dashboard stats and recent items
 * - Session-based user role detection for content filtering
 * - Real-time updates every 30 seconds for live dashboard metrics
 * 
 * Navigation:
 * - Entry points: Main navigation, post-login redirect, portal fallback
 * - Exit points: Quick actions to tickets, time tracking, account management
 * - Deep linking: No URL parameters, serves as application hub
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileText, DollarSign, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { RecentTimeEntries } from "@/components/dashboard/RecentTimeEntries";
import { usePermissions } from "@/hooks/usePermissions";

interface DashboardStats {
  activeTickets: number;
  weekHours: string;
  totalAccounts: number;
  monthlyRevenue: number;
}

interface RecentTicket {
  id: string;
  ticketNumber: string;
  title: string;
  accountName: string;
  priority: string;
  status: string;
  assigneeName: string;
}

interface ActivityItem {
  type: 'ticket_created' | 'time_logged' | 'invoice_generated';
  message: string;
  ticketId?: string;
  invoiceId?: string;
  minutes?: number;
  timestamp: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeTickets: 0,
    weekHours: "0",
    totalAccounts: 0,
    monthlyRevenue: 0
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const {
    canViewTickets,
    canCreateTimeEntries,
    canViewAccounts,
    canCreateInvoices,
    canViewInvoices,
    isSuperAdmin,
    loading: permissionsLoading
  } = usePermissions();

  // Check if user has account memberships (portal user)
  const hasAccountMemberships = session?.user?.memberships && session.user.memberships.length > 0;
  const hasSystemRoles = session?.user?.systemRoles && session.user.systemRoles.length > 0;
  const isPortalUser = hasAccountMemberships && !hasSystemRoles;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && isPortalUser) {
      router.push("/portal");
    }
  }, [status, session, router, isPortalUser]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (status !== "authenticated") return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setRecentTickets(data.recentTickets);
          setRecentActivity(data.recentActivity);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh dashboard data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, [status]);

  if (status === "loading" || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Permission-based access instead of role-based
  const canManageSystem = isSuperAdmin;
  const canManageTickets = canViewTickets;

  const statsCards = [
    {
      title: "Active Tickets",
      value: isLoading ? "..." : stats.activeTickets.toString(),
      description: "Open support tickets",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Hours This Week",
      value: isLoading ? "..." : stats.weekHours,
      description: "Time logged this week",
      icon: Clock,
      color: "text-green-600",
    },
    {
      title: "Total Accounts",
      value: isLoading ? "..." : stats.totalAccounts.toString(),
      description: "Active client accounts",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Monthly Revenue",
      value: isLoading ? "..." : `$${stats.monthlyRevenue.toLocaleString()}`,
      description: "Revenue this month",
      icon: DollarSign,
      color: "text-yellow-600",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return "bg-green-500";
      case 'time_logged':
        return "bg-blue-500";
      case 'invoice_generated':
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {canViewTickets && (
                <TabsTrigger value="tickets">Recent Tickets</TabsTrigger>
              )}
              {canCreateTimeEntries && (
                <TabsTrigger value="time">Time Entries</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest updates and activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 ${getActivityIcon(activity.type)} rounded-full`}></div>
                            <div className="flex-1">
                              <span className="text-sm">{activity.message}</span>
                              {activity.minutes && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({activity.minutes}m)
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-2">
                                {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent activity
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks and shortcuts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {canViewTickets && (
                      <Button 
                        className="w-full justify-start"
                        onClick={() => router.push("/tickets/new")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Ticket
                      </Button>
                    )}
                    {canCreateTimeEntries && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push("/time")}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Log Time Entry
                      </Button>
                    )}
                    {canViewAccounts && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push("/accounts/new")}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Add New Account
                      </Button>
                    )}
                    {canCreateInvoices && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => router.push("/invoices/generate")}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Generate Invoice
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {canViewTickets && (
              <TabsContent value="tickets" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>
                      Latest support tickets and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : recentTickets.length > 0 ? (
                      <div className="space-y-4">
                        {recentTickets.map((ticket) => (
                          <div 
                            key={ticket.id} 
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/tickets/${ticket.id}`)}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{ticket.ticketNumber}</span>
                                <Badge variant={
                                  ticket.priority === "HIGH" ? "destructive" :
                                  ticket.priority === "MEDIUM" ? "default" : "secondary"
                                }>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{ticket.title}</p>
                              <p className="text-sm text-muted-foreground">{ticket.accountName}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
                              <span className="text-xs text-muted-foreground">{ticket.assigneeName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No tickets yet</h3>
                        <p className="text-sm text-muted-foreground">Create your first ticket to get started.</p>
                        <Button 
                          className="mt-4"
                          onClick={() => router.push("/tickets/new")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Ticket
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {canCreateTimeEntries && (
              <TabsContent value="time" className="space-y-4">
                <RecentTimeEntries userId={session.user?.id} limit={10} />
              </TabsContent>
            )}
          </Tabs>
        </div>
    </div>
  );
}