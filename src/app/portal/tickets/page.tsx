"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  Plus, 
  LogOut, 
  Settings, 
  User, 
  ArrowLeft,
  Calendar,
  MessageSquare
} from "lucide-react";

export default function CustomerTickets() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session.user?.role !== "CUSTOMER") {
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

  if (!session || session.user?.role !== "CUSTOMER") {
    return null;
  }

  // Mock data - will be replaced with real data from database
  const allTickets = [
    {
      id: "T-001",
      title: "Fix login issue",
      description: "Users are unable to login to the system after the recent update",
      status: "In Progress",
      priority: "High",
      createdAt: "2024-01-25",
      updatedAt: "2024-01-26",
      assignee: "John Doe",
      category: "Bug",
      timeSpent: 4.5,
      comments: 3
    },
    {
      id: "T-002",
      title: "Feature request: Dark mode",
      description: "Please add dark mode support to the application",
      status: "Open",
      priority: "Medium",
      createdAt: "2024-01-24",
      updatedAt: "2024-01-24",
      assignee: "Jane Smith",
      category: "Feature",
      timeSpent: 0,
      comments: 1
    },
    {
      id: "T-003",
      title: "Performance optimization",
      description: "The dashboard loads slowly on mobile devices",
      status: "Resolved",
      priority: "Low",
      createdAt: "2024-01-22",
      updatedAt: "2024-01-25",
      assignee: "John Doe",
      category: "Enhancement",
      timeSpent: 8.0,
      comments: 5
    },
    {
      id: "T-004",
      title: "Email notifications not working",
      description: "Not receiving email notifications for ticket updates",
      status: "Closed",
      priority: "Medium",
      createdAt: "2024-01-20",
      updatedAt: "2024-01-23",
      assignee: "Jane Smith",
      category: "Bug",
      timeSpent: 2.5,
      comments: 2
    },
    {
      id: "T-005",
      title: "API documentation request",
      description: "Need comprehensive API documentation for integration",
      status: "Open",
      priority: "Low",
      createdAt: "2024-01-18",
      updatedAt: "2024-01-19",
      assignee: "John Doe",
      category: "Documentation",
      timeSpent: 1.0,
      comments: 0
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

  const filterTickets = (tickets: typeof allTickets, filter: string) => {
    switch (filter) {
      case "open":
        return tickets.filter(t => t.status === "Open" || t.status === "In Progress");
      case "closed":
        return tickets.filter(t => t.status === "Resolved" || t.status === "Closed");
      case "high":
        return tickets.filter(t => t.priority === "High");
      default:
        return tickets;
    }
  };

  const filteredTickets = filterTickets(allTickets, selectedFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/portal")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-semibold">My Tickets</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {session.user?.name || session.user?.email}
            </span>
            <Badge variant="secondary">Customer</Badge>
            
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
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
              <p className="text-muted-foreground">
                View and manage your support requests
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={selectedFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter("all")}
                >
                  All Tickets ({allTickets.length})
                </Button>
                <Button 
                  variant={selectedFilter === "open" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter("open")}
                >
                  Open ({allTickets.filter(t => t.status === "Open" || t.status === "In Progress").length})
                </Button>
                <Button 
                  variant={selectedFilter === "closed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter("closed")}
                >
                  Closed ({allTickets.filter(t => t.status === "Resolved" || t.status === "Closed").length})
                </Button>
                <Button 
                  variant={selectedFilter === "high" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter("high")}
                >
                  High Priority ({allTickets.filter(t => t.priority === "High").length})
                </Button>
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
                    {selectedFilter === "all" 
                      ? "You haven't created any support tickets yet."
                      : `No tickets match the "${selectedFilter}" filter.`
                    }
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium">{ticket.id}</span>
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </div>

                        {/* Title and Description */}
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{ticket.title}</h3>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {ticket.createdAt}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned: {ticket.assignee}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Time: {ticket.timeSpent}h
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Comments: {ticket.comments}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        {(ticket.status === "Open" || ticket.status === "In Progress") && (
                          <Button variant="ghost" size="sm">
                            Add Comment
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary Stats */}
          {filteredTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredTickets.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedFilter === "all" ? "Total" : "Filtered"} Tickets
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredTickets.reduce((sum, t) => sum + t.timeSpent, 0).toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Time Spent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {filteredTickets.filter(t => t.status === "Open" || t.status === "In Progress").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {filteredTickets.reduce((sum, t) => sum + t.comments, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}