"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Edit,
  Save,
  X,
  Plus,
  Building,
  Building2,
  User,
  Mail,
  Phone,
  Clock,
  FileText,
  DollarSign,
  Settings,
  MoreVertical,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock4,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { CreateAccountUserDialog } from "@/components/accounts/CreateAccountUserDialog";
import { EditAccountUserDialog } from "@/components/accounts/EditAccountUserDialog";
import { AccountUserPermissionDialog } from "@/components/accounts/AccountUserPermissionDialog";
import { AccountUserRoleManager } from "@/components/accounts/AccountUserRoleManager";
import { AddExistingUserDialog } from "@/components/accounts/AddExistingUserDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { AccountUserWithStatus, getAccountUserStatusDisplay } from "@/types/account-user";

interface AccountDetails {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  address?: string;
  phone?: string;
  parentAccount?: { id: string; name: string; accountType: string };
  childAccounts: Array<{ id: string; name: string; accountType: string }>;
  accountUsers: AccountUserWithStatus[];
  allAccountUsers?: (AccountUserWithStatus & { sourceAccount: string })[];
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
  const searchParams = useSearchParams();
  const accountId = params.id as string;
  const initialTab = searchParams.get('tab') || 'overview';
  
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
  const [isAddExistingUserDialogOpen, setIsAddExistingUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [showMoveUserDialog, setShowMoveUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToMove, setUserToMove] = useState<AccountUserWithStatus | null>(null);
  const [userToEdit, setUserToEdit] = useState<AccountUserWithStatus | null>(null);
  const [userToDelete, setUserToDelete] = useState<AccountUserWithStatus | null>(null);
  
  const { 
    canCreateUsers, 
    canResendInvitations, 
    canUpdateUsers, 
    canDeleteUsers, 
    canViewAccounts,
    loading: permissionsLoading 
  } = usePermissions();

  const handleMoveUser = (accountUser: AccountUserWithStatus) => {
    setUserToMove(accountUser);
    setShowMoveUserDialog(true);
  };

  const handleEditUser = (accountUser: AccountUserWithStatus) => {
    setUserToEdit(accountUser);
    setIsEditUserDialogOpen(true);
  };

  const handleManagePermissions = (accountUser: AccountUserWithStatus) => {
    setUserToEdit(accountUser);
    setIsPermissionDialogOpen(true);
  };

  const handleDeleteUser = (accountUser: AccountUserWithStatus) => {
    setUserToDelete(accountUser);
    setShowDeleteUserDialog(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/account-users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAccount();
        setShowDeleteUserDialog(false);
        setUserToDelete(null);
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleToggleUserAssignment = async (accountUser: AccountUserWithStatus) => {
    try {
      const response = await fetch(`/api/account-users/${accountUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !accountUser.isActive
        }),
      });

      if (response.ok) {
        await fetchAccount();
      } else {
        const error = await response.json();
        alert(`Failed to update user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleSendEmail = (accountUser: AccountUserWithStatus) => {
    const emailSubject = `Regarding ${account?.name} Account`;
    const mailtoLink = `mailto:${accountUser.email}?subject=${encodeURIComponent(emailSubject)}`;
    window.open(mailtoLink, '_blank');
  };

  const handleMoveUserToAccount = async (targetAccountId: string) => {
    if (!userToMove) return;

    try {
      const response = await fetch(`/api/account-users/${userToMove.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: targetAccountId }),
      });

      if (response.ok) {
        // Refresh the account data
        await fetchAccount();
        setShowMoveUserDialog(false);
        setUserToMove(null);
      } else {
        const error = await response.json();
        alert(`Failed to move user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error moving user:', error);
      alert('Failed to move user. Please try again.');
    }
  };

  const handleResendInvitation = async (accountUserId: string, userName: string) => {
    if (!confirm(`Are you sure you want to resend the invitation to ${userName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/account-users/${accountUserId}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await response.json();
        alert(`Invitation sent successfully to ${userName}`);
        fetchAccount(); // Refresh account data
      } else {
        const error = await response.json();
        alert(`Failed to send invitation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  const getUserStatusBadges = (accountUser: AccountUserWithStatus) => {
    
    return (
      <div className="flex flex-col gap-1">
        {/* Assignment Status */}
        <Badge 
          variant={accountUser.isActive ? "outline" : "destructive"} 
          className={accountUser.isActive ? "text-green-600 border-green-600" : ""}
        >
          {accountUser.isActive ? (
            <><CheckCircle className="h-3 w-3 mr-1" />Can be assigned</>
          ) : (
            <><AlertTriangle className="h-3 w-3 mr-1" />Disabled</>
          )}
        </Badge>
        
        {/* Login Status */}
        <Badge variant="secondary">
          {accountUser.hasLogin ? (
            <><CheckCircle className="h-3 w-3 mr-1" />Login activated</>
          ) : accountUser.invitationToken ? (
            <><Clock4 className="h-3 w-3 mr-1" />Invitation pending</>
          ) : (
            <><AlertTriangle className="h-3 w-3 mr-1" />No invitation</>
          )}
        </Badge>
      </div>
    );
  };

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
    } else if (status === "authenticated" && !permissionsLoading) {
      if (!canViewAccounts) {
        router.push("/dashboard");
      } else {
        fetchAccount();
      }
    }
  }, [status, session, router, accountId, canViewAccounts, permissionsLoading]);

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

  if (status === "loading" || isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !canViewAccounts) {
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
    <>

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
          <Tabs defaultValue={initialTab} className="space-y-4">
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

              {/* Parent Account */}
              {account.parentAccount && (
                <Card>
                  <CardHeader>
                    <CardTitle>Parent Organization</CardTitle>
                    <CardDescription>Primary account this subsidiary belongs to</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                         onClick={() => router.push(`/accounts/${account.parentAccount.id}`)}>
                      <div className="flex items-center space-x-2">
                        {getAccountTypeIcon(account.parentAccount.accountType)}
                        <span className="font-medium">{account.parentAccount.name}</span>
                      </div>
                      {getAccountTypeBadge(account.parentAccount.accountType)}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                      <CardTitle>All Account Users</CardTitle>
                      <CardDescription>
                        Users with access to this account and its subsidiary accounts
                        {account.allAccountUsers && ` (${account.allAccountUsers.length} total)`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {canCreateUsers && (
                        <Button onClick={() => setIsCreateUserDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Invite User
                        </Button>
                      )}
                      {canCreateUsers && (
                        <Button variant="outline" onClick={() => setIsAddExistingUserDialogOpen(true)}>
                          <Users className="mr-2 h-4 w-4" />
                          Add Existing User
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(account.allAccountUsers || account.accountUsers).length > 0 ? (
                      (account.allAccountUsers || account.accountUsers.map(u => ({ ...u, sourceAccount: account.name }))).map((accountUser) => {
                      const hasExpiredInvitation = accountUser.invitationExpiry && 
                        new Date(accountUser.invitationExpiry) < new Date();
                      
                      return (
                        <div key={accountUser.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex items-start space-x-4">
                            <div className="relative">
                              <User className="h-8 w-8 p-2 bg-muted rounded-full" />
                              {accountUser.isActive && (
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                              {!accountUser.isActive && (
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="font-medium">{accountUser.name}</p>
                                {accountUser.sourceAccount !== account.name && (
                                  <Badge variant="outline" className="text-xs">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {accountUser.sourceAccount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{accountUser.email}</p>
                              
                              {/* Status Badges */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {getUserStatusBadges(accountUser)}
                              </div>
                              
                              {/* User Statistics */}
                              {accountUser.stats && (
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>Tickets: {accountUser.stats.tickets.created} created</span>
                                    {accountUser.stats.tickets.assigned > 0 && (
                                      <span>, {accountUser.stats.tickets.assigned} assigned</span>
                                    )}
                                  </div>
                                  {accountUser.stats.timeEntries.total > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Time: {Math.floor(accountUser.stats.timeEntries.totalMinutes / 60)}h {accountUser.stats.timeEntries.totalMinutes % 60}m</span>
                                      {accountUser.stats.timeEntries.billableMinutes > 0 && (
                                        <span className="text-green-600">
                                          ({Math.floor(accountUser.stats.timeEntries.billableMinutes / 60)}h {accountUser.stats.timeEntries.billableMinutes % 60}m billable)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Additional Status Info */}
                              {hasExpiredInvitation && (
                                <p className="text-xs text-red-600 mt-2">
                                  Invitation expired on {new Date(accountUser.invitationExpiry!).toLocaleDateString()}
                                </p>
                              )}
                              {accountUser.invitationToken && !hasExpiredInvitation && accountUser.invitationExpiry && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Invitation expires on {new Date(accountUser.invitationExpiry).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* View User Details */}
                                <DropdownMenuItem onClick={() => router.push(`/users/${accountUser.userId || accountUser.id}`)}>
                                  <User className="h-4 w-4 mr-2" />
                                  View User Details
                                </DropdownMenuItem>

                                {/* Edit User */}
                                {canUpdateUsers && (
                                  <DropdownMenuItem onClick={() => handleEditUser(accountUser)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                )}

                                {/* Manage Permissions */}
                                {canUpdateUsers && (
                                  <DropdownMenuItem onClick={() => handleManagePermissions(accountUser)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage Permissions
                                  </DropdownMenuItem>
                                )}

                                {/* Toggle Assignment Status */}
                                {canUpdateUsers && (
                                  <DropdownMenuItem onClick={() => handleToggleUserAssignment(accountUser)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    {accountUser.isActive ? 'Disable Assignment' : 'Enable Assignment'}
                                  </DropdownMenuItem>
                                )}

                                {/* Show resend invitation for users without login who have invitations */}
                                {(!accountUser.hasLogin && accountUser.invitationToken) && canResendInvitations && (
                                  <DropdownMenuItem 
                                    onClick={() => handleResendInvitation(accountUser.id, accountUser.name)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Resend Invitation
                                  </DropdownMenuItem>
                                )}

                                {/* Move to Account */}
                                {canUpdateUsers && (
                                  <DropdownMenuItem onClick={() => handleMoveUser(accountUser)}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Move to Account
                                  </DropdownMenuItem>
                                )}

                                {/* Send Email */}
                                <DropdownMenuItem onClick={() => handleSendEmail(accountUser)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>

                                {/* Delete User */}
                                {canDeleteUsers && (
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(accountUser)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })) : (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">No users</h3>
                        <p className="text-sm text-muted-foreground">Invite users to access this account and its subsidiaries.</p>
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

      {/* Add Existing User Dialog */}
      <AddExistingUserDialog
        open={isAddExistingUserDialogOpen}
        onOpenChange={setIsAddExistingUserDialogOpen}
        accountId={accountId}
        accountName={account?.name || ''}
        onUserAdded={fetchAccount}
      />

      {/* Edit User Dialog */}
      <EditAccountUserDialog
        isOpen={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        accountUser={userToEdit}
        onUserUpdated={fetchAccount}
      />

      {/* Permission Dialog */}
      <AccountUserPermissionDialog
        isOpen={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
        accountUser={userToEdit}
        onPermissionsUpdated={fetchAccount}
      />

      {/* Move User Dialog */}
      <Dialog open={showMoveUserDialog} onOpenChange={setShowMoveUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move User to Account</DialogTitle>
            <DialogDescription>
              Select the account to move {userToMove?.name} to. Users can be moved between the primary account and its child accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Account Option */}
            {account && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available Accounts</h4>
                <div className="space-y-2">
                  {/* Primary Account */}
                  {account.parentAccount ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => account.parentAccount?.id && handleMoveUserToAccount(account.parentAccount.id)}
                      disabled={userToMove?.account?.id === account.parentAccount?.id}
                    >
                      <Building className="h-4 w-4 mr-2" />
                      {account.parentAccount.name} (Primary Account)
                      {userToMove?.account?.id === account.parentAccount?.id && (
                        <Badge variant="secondary" className="ml-auto">Current</Badge>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleMoveUserToAccount(account.id)}
                      disabled={userToMove?.account?.id === account.id}
                    >
                      <Building className="h-4 w-4 mr-2" />
                      {account.name} (Primary Account)
                      {userToMove?.account?.id === account.id && (
                        <Badge variant="secondary" className="ml-auto">Current</Badge>
                      )}
                    </Button>
                  )}
                  
                  {/* Child Accounts */}
                  {account.childAccounts.map((childAccount) => (
                    <Button
                      key={childAccount.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleMoveUserToAccount(childAccount.id)}
                      disabled={userToMove?.account?.id === childAccount.id}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      {childAccount.name} ({childAccount.accountType})
                      {userToMove?.account?.id === childAccount.id && (
                        <Badge variant="secondary" className="ml-auto">Current</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Remove User</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{userToDelete?.name}</strong> from this account? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Warning</p>
                    <p className="text-red-700 mt-1">
                      Removing this user will:
                    </p>
                    <ul className="list-disc list-inside text-red-700 mt-2 ml-2">
                      <li>Remove their access to this account</li>
                      <li>Delete their account if this is their only account access</li>
                      <li>Cannot be undone once confirmed</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 p-2 bg-background rounded-full" />
                  <div>
                    <p className="font-medium">{userToDelete.name}</p>
                    <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteUserDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDeleteUser}
            >
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}