"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileText, DollarSign, Plus, Settings, LogOut, Menu, Shield } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && (session?.user?.role === "CUSTOMER" || session?.user?.role === "ACCOUNT_USER")) {
      router.push("/portal");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = session.user?.role === "ADMIN";
  const isEmployee = session.user?.role === "EMPLOYEE" || isAdmin;

  const stats = [
    {
      title: "Active Tickets",
      value: "12",
      description: "Open support tickets",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Hours This Week",
      value: "32.5",
      description: "Time logged this week",
      icon: Clock,
      color: "text-green-600",
    },
    {
      title: "Total Accounts",
      value: "8",
      description: "Active client accounts",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Monthly Revenue",
      value: "$12,450",
      description: "Revenue this month",
      icon: DollarSign,
      color: "text-yellow-600",
    },
  ];

  const recentTickets = [
    { id: "T-001", title: "Fix login issue", account: "TechCorp Solutions", priority: "High", status: "In Progress" },
    { id: "T-002", title: "Database optimization", account: "Tech Solutions", priority: "Medium", status: "Open" },
    { id: "T-003", title: "UI improvements", account: "StartupXYZ", priority: "Low", status: "Review" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2 ml-4 md:ml-0">
            <h1 className="text-xl font-semibold">Service Vault</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {session.user?.name || session.user?.email}
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

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0`}>
          <div className="flex h-full flex-col">
            <div className="p-6">
              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Overview
                </Button>
                {isEmployee && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/tickets")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Tickets
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/time")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Time Tracking
                    </Button>
                  </>
                )}
                {isAdmin && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/accounts")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Accounts
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/billing")}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Billing
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/reports")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Reports
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/permissions")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Permissions
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => router.push("/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </>
                )}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
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
                {isEmployee && (
                  <>
                    <TabsTrigger value="tickets">Recent Tickets</TabsTrigger>
                    <TabsTrigger value="time">Time Entries</TabsTrigger>
                  </>
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
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">New ticket created by TechCorp Solutions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">Time entry logged for T-001</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">Invoice #INV-2024-001 generated</span>
                        </div>
                      </div>
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
                      {isEmployee && (
                        <>
                          <Button 
                            className="w-full justify-start"
                            onClick={() => router.push("/tickets")}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Ticket
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => router.push("/time")}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Log Time Entry
                          </Button>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => router.push("/accounts")}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Manage Accounts
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => router.push("/billing")}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Generate Invoice
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {isEmployee && (
                <TabsContent value="tickets" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Tickets</CardTitle>
                      <CardDescription>
                        Latest support tickets and their status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recentTickets.map((ticket) => (
                          <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{ticket.id}</span>
                                <Badge variant={
                                  ticket.priority === "High" ? "destructive" :
                                  ticket.priority === "Medium" ? "default" : "secondary"
                                }>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{ticket.title}</p>
                              <p className="text-sm text-muted-foreground">{ticket.account}</p>
                            </div>
                            <Badge variant="outline">{ticket.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {isEmployee && (
                <TabsContent value="time" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Time Tracking</CardTitle>
                      <CardDescription>
                        Your recent time entries
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No time entries</h3>
                        <p className="text-sm text-muted-foreground">Start tracking your time on tickets.</p>
                        <Button className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Log Time Entry
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}