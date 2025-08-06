"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Plus, LogOut, Settings, User } from "lucide-react";

export default function CustomerPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Check if user has account memberships but no system roles (portal user)
      const hasAccountMemberships = session.user?.memberships && session.user.memberships.length > 0;
      const hasSystemRoles = session.user?.systemRoles && session.user.systemRoles.length > 0;
      const isPortalUser = hasAccountMemberships && !hasSystemRoles;
      
      if (!isPortalUser) {
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Check if user is a portal user
  const hasAccountMemberships = session?.user?.memberships && session.user.memberships.length > 0;
  const hasSystemRoles = session?.user?.systemRoles && session.user.systemRoles.length > 0;
  const isPortalUser = hasAccountMemberships && !hasSystemRoles;

  if (!session || !isPortalUser) {
    return null;
  }

  // Mock data - will be replaced with real data from database
  const customerStats = {
    openTickets: 3,
    totalTickets: 12,
    hoursLogged: 45.5,
    lastActivity: "2 hours ago"
  };

  const recentTickets = [
    {
      id: "T-001",
      title: "Fix login issue",
      status: "In Progress",
      priority: "High",
      createdAt: "2024-01-25",
      assignee: "John Doe"
    },
    {
      id: "T-002",
      title: "Feature request: Dark mode",
      status: "Open",
      priority: "Medium",
      createdAt: "2024-01-24",
      assignee: "Jane Smith"
    },
    {
      id: "T-003",
      title: "Performance optimization",
      status: "Resolved",
      priority: "Low",
      createdAt: "2024-01-22",
      assignee: "John Doe"
    }
  ];

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "open": return "default";
      case "in progress": return "secondary";
      case "resolved": return "outline";
      case "closed": return "outline";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority.toLowerCase()) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Account Portal</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">
              {session.user?.accountUser?.account?.name || 
               (session.user?.role === "ACCOUNT_USER" ? "Account User" : "Customer")}
            </Badge>
            
            <Button variant="ghost" size="icon">
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
          {/* Welcome Section */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Track your support tickets and view service activity.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerStats.openTickets}</div>
                <p className="text-xs text-muted-foreground">
                  Active support requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerStats.totalTickets}</div>
                <p className="text-xs text-muted-foreground">
                  All time requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerStats.hoursLogged}</div>
                <p className="text-xs text-muted-foreground">
                  Time spent on your issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sm">{customerStats.lastActivity}</div>
                <p className="text-xs text-muted-foreground">
                  Recent update
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Tickets */}
            <Card className="md:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>
                      Your latest support requests
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Ticket
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{ticket.id}</span>
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{ticket.title}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Created: {ticket.createdAt}</span>
                          <span>Assigned: {ticket.assignee}</span>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.push("/portal/tickets")}
                  >
                    View All Tickets
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Info */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Support Request
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="lg"
                  onClick={() => router.push("/portal/tickets")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View All Tickets
                </Button>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Support Information</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Response time: Within 24 hours</p>
                    <p>• Support hours: Mon-Fri 9AM-6PM</p>
                    <p>• Emergency contact available</p>
                  </div>
                </div>

                <div className="mt-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/50">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Need Help?</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Contact our support team if you need assistance with your account or services.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}