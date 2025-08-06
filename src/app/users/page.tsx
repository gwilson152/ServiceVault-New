/**
 * User Management Page
 * 
 * Provides a unified interface for managing all users in the system.
 * Replaces the fragmented User/AccountUser system with the new 
 * AccountMembership model and role-based permissions.
 * 
 * Key Features:
 * - User list with search and filtering
 * - Account membership management
 * - Role assignment using RoleTemplate system
 * - User creation and invitation flows
 * - Bulk operations for user management
 * 
 * Integration:
 * - Uses /api/users and /api/account-users endpoints
 * - Integrates with PermissionService for access control
 * - Uses AccountMembership model for user-account relationships
 * - Supports both system-wide and account-specific roles
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountSelector, Account } from "@/components/selectors/account-selector";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  UserPlus,
  Mail,
  Users,
  Shield,
  AlertCircle,
  Loader2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";

interface User {
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
    };
    roles: {
      role: {
        id: string;
        name: string;
        description: string | null;
        inheritAllPermissions: boolean;
      };
    }[];
  }[];
  systemRoles: {
    role: {
      id: string;
      name: string;
      description: string | null;
      inheritAllPermissions: boolean;
    };
  }[];
}

// Account interface is now imported from AccountSelector

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  inheritAllPermissions: boolean;
  isSystemRole: boolean;
  scope: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    accountId: "",
    roleId: ""
  });
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    roleId: ""
  });

  const { toast } = useToast();
  const router = useRouter();

  // Load data on component mount
  useEffect(() => {
    loadUsers();
    loadAccounts();
    loadRoleTemplates();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users?includeAccountInfo=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error('Failed to load users');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts/all');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadRoleTemplates = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoleTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load role templates:', error);
    }
  };

  const handleInviteUser = async () => {
    try {
      const response = await fetch('/api/account-users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User invitation sent successfully"
        });
        setShowInviteDialog(false);
        setInviteForm({ email: "", name: "", accountId: "", roleId: "" });
        loadUsers();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to invite user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user",
        variant: "destructive"
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      // Prepare payload for system-level user creation
      const payload = {
        name: createForm.name,
        email: createForm.email || null,
        password: createForm.password || null,
        systemRoleIds: createForm.roleId ? [createForm.roleId] : [],
        assignToDomainAccount: true // Enable automatic domain-based assignment
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "User created successfully"
        });
        setShowCreateDialog(false);
        setCreateForm({ email: "", name: "", password: "", roleId: "" });
        loadUsers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive"
      });
    }
  };

  // Filter users based on search and account selection
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAccount = selectedAccount === "all" || 
                          user.memberships.some(m => m.account.id === selectedAccount);
    
    return matchesSearch && matchesAccount;
  });

  const getUserRoles = (user: User) => {
    const roles: string[] = [];
    
    // Add system roles
    user.systemRoles.forEach(sr => {
      roles.push(sr.role.name);
    });
    
    // Add account roles
    user.memberships.forEach(membership => {
      membership.roles.forEach(role => {
        roles.push(`${role.role.name} (${membership.account.name})`);
      });
    });
    
    return roles;
  };

  const isSystemAdmin = (user: User) => {
    return user.systemRoles.some(sr => sr.role.inheritAllPermissions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage users, account memberships, and role assignments
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an email invitation to a new user
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleInviteUser(); }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      autoComplete="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-name">Name</Label>
                    <Input
                      id="invite-name"
                      autoComplete="name"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-account">Account</Label>
                    <AccountSelector
                      accounts={accounts}
                      value={inviteForm.accountId}
                      onValueChange={(value) => setInviteForm({...inviteForm, accountId: value})}
                      placeholder="Select account"
                      enableFilters={true}
                      enableGrouping={true}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select 
                      value={inviteForm.roleId} 
                      onValueChange={(value) => setInviteForm({...inviteForm, roleId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleTemplates.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} {role.inheritAllPermissions && "(Super Admin)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Send Invite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a system user. Email and password are optional but required for login. If email domain matches an account, user will be automatically assigned.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="create-name">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="create-name"
                      autoComplete="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-email">
                      Email <span className="text-sm text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="create-email"
                      type="email"
                      autoComplete="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                      placeholder="user@example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If email domain matches an account, user will be automatically assigned to that account
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="create-password">
                      Password <span className="text-sm text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="create-password"
                      type="password"
                      autoComplete="new-password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                      placeholder="Leave blank if user will set password later"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email and password are both required for user to login
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="create-role">
                      System Role <span className="text-sm text-muted-foreground">(optional)</span>
                    </Label>
                    <Select 
                      value={createForm.roleId} 
                      onValueChange={(value) => setCreateForm({...createForm, roleId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select system role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleTemplates.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} {role.inheritAllPermissions && "(Super Admin)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      System roles provide application-wide permissions
                    </p>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <AccountSelector
                accounts={accounts}
                value={selectedAccount === "all" ? "" : selectedAccount}
                onValueChange={(value) => setSelectedAccount(value || "all")}
                placeholder="All Accounts"
                enableFilters={true}
                enableGrouping={true}
                allowClear={true}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name || user.email}
                            {isSystemAdmin(user) && (
                              <Shield className="h-4 w-4 text-orange-500" title="System Administrator" />
                            )}
                          </div>
                          {user.name && (
                            <div className="text-sm text-gray-500">{user.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.memberships.length === 0 ? (
                          <Badge variant="secondary">No Accounts</Badge>
                        ) : (
                          user.memberships.map((membership) => (
                            <Badge key={membership.id} variant="outline">
                              {membership.account.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getUserRoles(user).length === 0 ? (
                          <Badge variant="secondary">No Roles</Badge>
                        ) : (
                          getUserRoles(user).slice(0, 2).map((role, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {role}
                            </Badge>
                          ))
                        )}
                        {getUserRoles(user).length > 2 && (
                          <Badge variant="secondary">
                            +{getUserRoles(user).length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/users/${user.id}`)}
                        title="View user details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </main>
  );
}