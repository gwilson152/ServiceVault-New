"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  LogOut, 
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Building,
  User,
  Mail,
  Phone,
  Clock,
  FileText,
  DollarSign,
  Settings,
  Calendar,
  TrendingUp
} from "lucide-react";
import { CreateAccountUserDialog } from "@/components/accounts/CreateAccountUserDialog";
import { AccountUserRoleManager } from "@/components/accounts/AccountUserRoleManager";
import { usePermissions } from "@/hooks/usePermissions";

interface AccountDetails {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  address?: string;
  phone?: string;
  parentAccount?: { id: string; name: string; accountType: string };
  childAccounts: Array<{ id: string; name: string; accountType: string }>;
  accountUsers: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    user?: { id: string; name: string; email: string };
    invitationToken?: string;
  }>;
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    assignee?: { name: string };
  }>;
  timeEntries: Array<{
    id: string;
    description: string;
    hours: number;
    date: string;
    noCharge: boolean;
    user: { name: string };
    ticket?: { id: string; title: string };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
  stats: {
    users: { total: number; active: number; pending: number };
    tickets: { total: number; open: number; inProgress: number; resolved: number };
    timeEntries: { total: number; totalHours: number; billableHours: number; nonBillableHours: number };
    invoices: { total: number; totalAmount: number };
  };
}

export default function AccountDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    address: '',
    phone: ''
  });
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  
  const { canCreateUsers } = usePermissions();

  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
        setEditForm({
          name: data.name || '',
          companyName: data.companyName || '',
          address: data.address || '',
          phone: data.phone || ''
        });
      } else {
        console.error('Failed to fetch account');
      }
    } catch (error) {
      console.error('Error fetching account:', error);
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
        fetchAccount();
      }
    }
  }, [status, session, router, accountId]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const updatedAccount = await response.json();
        setAccount(prev => prev ? { ...prev, ...updatedAccount } : null);
        setIsEditing(false);
      } else {
        console.error('Failed to update account');
      }
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "EMPLOYEE")) {
    return null;
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Account Not Found</h2>
          <p className="text-muted-foreground mt-2">The requested account could not be found.</p>
          <Button className="mt-4" onClick={() => router.push("/accounts")}>
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4" />;
      case "SUBSIDIARY": return <Building className="h-4 w-4 text-blue-500" />;
      case "INDIVIDUAL": return <User className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Badge variant="default">Organization</Badge>;
      case "SUBSIDIARY": return <Badge variant="secondary">Subsidiary</Badge>;
      case "INDIVIDUAL": return <Badge variant="outline">Individual</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return <Badge variant="default">Open</Badge>;
      case "in_progress": return <Badge variant="secondary">In Progress</Badge>;
      case "resolved": return <Badge variant="outline">Resolved</Badge>;
      case "closed": return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/accounts")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            {getAccountTypeIcon(account.accountType)}
            <h1 className="text-xl font-semibold">{account.name}</h1>
            {getAccountTypeBadge(account.accountType)}
          </div>

          <div className="ml-auto flex items-center space-x-4">
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
          {/* Account Header Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{account.name}</CardTitle>
                  {account.companyName && account.companyName !== account.name && (
                    <CardDescription className="text-lg">{account.companyName}</CardDescription>
                  )}
                  {account.parentAccount && (
                    <CardDescription className="text-blue-600">
                      Parent: {account.parentAccount.name}
                    </CardDescription>
                  )}
                </div>
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    {account.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{account.phone}</span>
                      </div>
                    )}
                    {account.address && (
                      <div className="flex items-start space-x-2">
                        <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="whitespace-pre-line">{account.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{account.stats.users.active}</div>
                        <div className="text-xs text-muted-foreground">Active Users</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{account.stats.tickets.total}</div>
                        <div className="text-xs text-muted-foreground">Total Tickets</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{(account.stats?.timeEntries?.totalHours || 0).toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Total Hours</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">${(account.stats?.invoices?.totalAmount || 0).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabbed Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="roles">User Roles</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
              <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates for this account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {account.timeEntries.slice(0, 5).map((entry, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.hours}h by {entry.user.name} • {new Date(entry.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {account.timeEntries.length === 0 && (
                        <p className="text-sm text-muted-foreground">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Statistics</CardTitle>
                    <CardDescription>Key metrics and performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Billable Hours</span>
                        <span className="font-medium">{(account.stats?.timeEntries?.billableHours || 0).toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Non-billable Hours</span>
                        <span className="font-medium">{(account.stats?.timeEntries?.nonBillableHours || 0).toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Open Tickets</span>
                        <span className="font-medium">{account.stats.tickets.open}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pending Users</span>
                        <span className="font-medium">{account.stats.users.pending}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Child Accounts */}
              {account.childAccounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Subsidiary Accounts</CardTitle>
                    <CardDescription>Child accounts under this organization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {account.childAccounts.map((child) => (
                        <div key={child.id} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                             onClick={() => router.push(`/accounts/${child.id}`)}>
                          <div className="flex items-center space-x-2">
                            {getAccountTypeIcon(child.accountType)}
                            <span className="font-medium">{child.name}</span>
                          </div>
                          {getAccountTypeBadge(child.accountType)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Account Users</CardTitle>
                      <CardDescription>Manage users and their access to this account</CardDescription>
                    </div>
                    {canCreateUsers && (
                      <Button onClick={() => setIsCreateUserDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Invite User
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {account.accountUsers.map((accountUser) => (
                      <div key={accountUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <User className="h-8 w-8 p-2 bg-muted rounded-full" />
                          <div>
                            <p className="font-medium">{accountUser.name}</p>
                            <p className="text-sm text-muted-foreground">{accountUser.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {accountUser.user ? (
                            <Badge variant="outline">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Invited</Badge>
                          )}
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {account.accountUsers.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No users</h3>
                        <p className="text-sm text-muted-foreground">Invite users to access this account.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Roles Tab */}
            <TabsContent value="roles" className="space-y-6">
              <AccountUserRoleManager 
                accountId={accountId}
                onRoleAssigned={fetchAccount}
              />
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tickets</CardTitle>
                      <CardDescription>Support tickets for this account</CardDescription>
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Ticket
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {account.tickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{ticket.id}</span>
                            <Badge variant={ticket.priority === "High" ? "destructive" : ticket.priority === "Medium" ? "default" : "secondary"}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{ticket.title}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                            {ticket.assignee && <span>Assigned: {ticket.assignee.name}</span>}
                          </div>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    ))}
                    {account.tickets.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No tickets</h3>
                        <p className="text-sm text-muted-foreground">Create a ticket to get started.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Time Tracking Tab */}
            <TabsContent value="time" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Time Entries</CardTitle>
                      <CardDescription>Time tracked for this account</CardDescription>
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Log Time
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {account.timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{entry.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                            <span>By: {entry.user.name}</span>
                            {entry.ticket && <span>Ticket: {entry.ticket.title}</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{entry.hours}h</span>
                          {entry.noCharge ? (
                            <Badge variant="secondary">No Charge</Badge>
                          ) : (
                            <Badge variant="outline">Billable</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {account.timeEntries.length === 0 && (
                      <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No time entries</h3>
                        <p className="text-sm text-muted-foreground">Start tracking time for this account.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoicing Tab */}
            <TabsContent value="invoicing" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Invoices</CardTitle>
                      <CardDescription>Invoices for this account</CardDescription>
                    </div>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Invoice
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {account.invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(invoice.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">${(invoice.total || 0).toFixed(2)}</span>
                          <Badge variant={invoice.status === "PAID" ? "outline" : invoice.status === "SENT" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {account.invoices.length === 0 && (
                      <div className="text-center py-8">
                        <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No invoices</h3>
                        <p className="text-sm text-muted-foreground">Generate an invoice to get started.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Configure account-specific settings and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Account Settings</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Configure permissions, billing settings, and other account-specific options.
                    </p>
                    <Button variant="outline">
                      Configure Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create User Dialog */}
      <CreateAccountUserDialog
        isOpen={isCreateUserDialogOpen}
        onOpenChange={setIsCreateUserDialogOpen}
        accountId={accountId}
        accountName={account?.name || ''}
        onUserCreated={fetchAccount}
      />
    </div>
  );
}