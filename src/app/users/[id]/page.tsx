/**
 * User Detail Page
 * 
 * Comprehensive user management interface showing:
 * - User profile information and settings
 * - Account memberships and role assignments  
 * - Recent time entries and activity
 * - Associated tickets (created and assigned)
 * - Edit capabilities and delete functionality
 * 
 * Features:
 * - Permission-based access control
 * - Real-time data loading with loading states
 * - Edit user profile (name, email)
 * - Delete user with safety confirmation
 * - Navigate to related tickets and time entries
 * - Account membership management
 * 
 * Integration:
 * - Uses /api/users/[id] for user operations
 * - Integrates with PermissionService for access control
 * - Links to /tickets and /time pages for detailed views
 * - Follows consistent UI patterns from other detail pages
 */

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Ticket,
  Shield,
  Edit2,
  Trash2,
  Save,
  X,
  ArrowLeft,
  Building,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Plus,
  Settings,
  UserCheck
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";
import { AssignAccountDialog } from "@/components/users/AssignAccountDialog";
import { UserRoleManagementDialog } from "@/components/users/UserRoleManagementDialog";
import { UserStatusManagementDialog } from "@/components/users/UserStatusManagementDialog";
import { SystemRoleManagementDialog } from "@/components/users/SystemRoleManagementDialog";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
  memberships: {
    id: string;
    account: {
      id: string;
      name: string;
      accountType: string;
      parentId: string | null;
      parent: {
        id: string;
        name: string;
      } | null;
    };
    roles: {
      role: {
        id: string;
        name: string;
        description: string | null;
        inheritAllPermissions: boolean;
        permissions: {
          id: string;
          resource: string;
          action: string;
          scope: string;
        }[];
      };
    }[];
  }[];
  systemRoles: {
    role: {
      id: string;
      name: string;
      description: string | null;
      inheritAllPermissions: boolean;
      permissions: {
        id: string;
        resource: string;
        action: string;
        scope: string;
      }[];
    };
  }[];
  timeEntries: {
    id: string;
    description: string;
    duration: number;
    date: string;
    billable: boolean;
    createdAt: string;
    ticket: {
      id: string;
      title: string;
      status: string;
    } | null;
    account: {
      id: string;
      name: string;
    };
  }[];
  createdTickets: {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    account: {
      id: string;
      name: string;
    };
  }[];
  assignedTickets: {
    id: string;
    title: string;
    status: string;
    priority: string;
    updatedAt: string;
    account: {
      id: string;
      name: string;
    };
  }[];
  _count: {
    timeEntries: number;
    createdTickets: number;
    assignedTickets: number;
    memberships: number;
  };
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignAccountDialog, setShowAssignAccountDialog] = useState(false);
  const [showRoleManagementDialog, setShowRoleManagementDialog] = useState(false);
  const [showStatusManagementDialog, setShowStatusManagementDialog] = useState(false);
  const [showSystemRoleManagementDialog, setShowSystemRoleManagementDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: ""
  });

  const router = useRouter();
  const { toast } = useToast();
  const { canEditUsers, canDeleteUsers } = usePermissions();

  useEffect(() => {
    loadUser();
  }, [resolvedParams.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${resolvedParams.id}`);
      
      if (response.status === 404) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive"
        });
        router.push('/users');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load user');
      }
      
      const data = await response.json();
      setUser(data);
      setEditForm({
        name: data.name || "",
        email: data.email || ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/users/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "User updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type 'DELETE' to confirm",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/users/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      
      router.push('/users');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'default';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const isSystemAdmin = (user: UserDetail) => {
    return user.systemRoles.some(sr => sr.role.inheritAllPermissions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user details...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            User not found or you don't have permission to view this user.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/users')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <User className="h-8 w-8" />
                {user.name || user.email}
                {isSystemAdmin(user) && (
                  <Shield className="h-6 w-6 text-orange-500" title="System Administrator" />
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                User Details and Account Management
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {canEditUsers && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit User
              </Button>
            )}
            {canEditUsers && (
              <Button 
                variant="outline" 
                onClick={() => setShowRoleManagementDialog(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Manage Account Roles
              </Button>
            )}
            {canEditUsers && (
              <Button 
                variant="outline" 
                onClick={() => setShowSystemRoleManagementDialog(true)}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage System Roles
              </Button>
            )}
            {canEditUsers && (
              <Button 
                variant="outline" 
                onClick={() => setShowStatusManagementDialog(true)}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Manage Status
              </Button>
            )}
            {canDeleteUsers && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            )}
          </div>
        </div>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setEditing(false);
                    setEditForm({
                      name: user.name || "",
                      email: user.email || ""
                    });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Name</Label>
                    <p className="text-lg">{user.name || "Not provided"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Created</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="accounts">
              Accounts ({user._count.memberships})
            </TabsTrigger>
            <TabsTrigger value="time-entries">
              Time Entries ({user._count.timeEntries})
            </TabsTrigger>
            <TabsTrigger value="created-tickets">
              Created Tickets ({user._count.createdTickets})
            </TabsTrigger>
            <TabsTrigger value="assigned-tickets">
              Assigned Tickets ({user._count.assignedTickets})
            </TabsTrigger>
          </TabsList>

          {/* Account Memberships */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Account Memberships</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssignAccountDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign to Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user.memberships.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No account memberships</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.memberships.map((membership) => (
                      <div key={membership.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium">{membership.account.name}</h3>
                            <p className="text-sm text-gray-500">
                              {membership.account.accountType}
                              {membership.account.parent && (
                                <span> • Child of {membership.account.parent.name}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/accounts/${membership.account.id}`)}
                            >
                              <Building className="h-4 w-4 mr-2" />
                              View Account
                            </Button>
                            {canEditUsers && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowRoleManagementDialog(true)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Roles
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {membership.roles.length === 0 ? (
                            <Badge variant="secondary">No Roles</Badge>
                          ) : (
                            membership.roles.map((role, index) => (
                              <Badge 
                                key={index} 
                                variant={role.role.inheritAllPermissions ? "default" : "outline"}
                              >
                                {role.role.name}
                                {role.role.inheritAllPermissions && " (Super Admin)"}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* System Roles Section */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-500" />
                      System Roles ({user.systemRoles.length})
                    </h3>
                    {canEditUsers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSystemRoleManagementDialog(true)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage System Roles
                      </Button>
                    )}
                  </div>
                  
                  {user.systemRoles.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <Settings className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No system roles assigned</p>
                      <p className="text-xs text-gray-400">User has account-specific permissions only</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {user.systemRoles.map((systemRole, index) => (
                        <Badge 
                          key={index} 
                          variant={systemRole.role.inheritAllPermissions ? "default" : "outline"}
                          className={systemRole.role.inheritAllPermissions 
                            ? "bg-orange-100 text-orange-800 border-orange-200" 
                            : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {systemRole.role.inheritAllPermissions && (
                            <Settings className="h-3 w-3 mr-1" />
                          )}
                          {systemRole.role.name}
                          {systemRole.role.inheritAllPermissions && " (Super Admin)"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time Entries */}
          <TabsContent value="time-entries">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Time Entries</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/time?userId=${user.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user.timeEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No time entries</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{formatDuration(entry.duration)}</TableCell>
                          <TableCell>
                            {entry.ticket ? (
                              <Button 
                                variant="link" 
                                className="p-0 h-auto"
                                onClick={() => router.push(`/tickets/${entry.ticket?.id}`)}
                              >
                                {entry.ticket.title}
                              </Button>
                            ) : (
                              <span className="text-gray-500">No ticket</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.account ? entry.account.name : (
                              <span className="text-gray-500">No account</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.billable ? "default" : "secondary"}>
                              {entry.billable ? "Billable" : "Non-billable"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Created Tickets */}
          <TabsContent value="created-tickets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recently Created Tickets</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/tickets?createdBy=${user.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user.createdTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No created tickets</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.createdTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-left"
                              onClick={() => router.push(`/tickets/${ticket.id}`)}
                            >
                              {ticket.title}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{ticket.account.name}</TableCell>
                          <TableCell>
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assigned Tickets */}
          <TabsContent value="assigned-tickets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recently Assigned Tickets</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/tickets?assignedTo=${user.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user.assignedTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No assigned tickets</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.assignedTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-left"
                              onClick={() => router.push(`/tickets/${ticket.id}`)}
                            >
                              {ticket.title}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{ticket.account.name}</TableCell>
                          <TableCell>
                            {new Date(ticket.updatedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the user and remove all associated data.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Deleting this user will remove:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>User profile and login access</li>
                    <li>All account memberships and role assignments</li>
                    <li>Any related permissions</li>
                  </ul>
                  Time entries and tickets will remain but be unassigned.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="delete-confirmation">
                  Type <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm:
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE here"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleteConfirmation !== "DELETE"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Account Dialog */}
        <AssignAccountDialog
          open={showAssignAccountDialog}
          onOpenChange={setShowAssignAccountDialog}
          userId={user?.id || ""}
          userName={user?.name || ""}
          existingAccountIds={user?.memberships.map(m => m.account.id) || []}
          onAccountAssigned={loadUser}
        />

        {/* User Role Management Dialog */}
        <UserRoleManagementDialog
          open={showRoleManagementDialog}
          onOpenChange={setShowRoleManagementDialog}
          userId={user?.id || ""}
          userName={user?.name || user?.email || ""}
          memberships={user?.memberships || []}
          onRoleChanged={loadUser}
        />

        {/* User Status Management Dialog */}
        <UserStatusManagementDialog
          open={showStatusManagementDialog}
          onOpenChange={setShowStatusManagementDialog}
          userId={user?.id || ""}
          userName={user?.name || user?.email || ""}
          userEmail={user?.email || ""}
          onStatusChanged={loadUser}
        />

        {/* System Role Management Dialog */}
        <SystemRoleManagementDialog
          open={showSystemRoleManagementDialog}
          onOpenChange={setShowSystemRoleManagementDialog}
          userId={user?.id || ""}
          userName={user?.name || user?.email || ""}
          systemRoles={user?.systemRoles || []}
          onRoleChanged={loadUser}
        />
      </div>
    </main>
  );
}