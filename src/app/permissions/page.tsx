"use client";

import { useSession } from "next-auth/react";
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
import { 
  Shield, 
  Plus, 
  Settings, 
  Users,
  Edit,
  Trash2,
  UserCheck,
  Lock,
  Upload
} from "lucide-react";
import { UserSelector } from "@/components/permissions/UserSelector";
import { MultiUserSelector } from "@/components/permissions/MultiUserSelector";
import { AccountUserRoleManager } from "@/components/accounts/AccountUserRoleManager";
import { PERMISSIONS_REGISTRY, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions-registry";
import { Checkbox } from "@/components/ui/checkbox";

interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountUser {
  id: string;
  name: string;
  email: string;
  account: {
    id: string;
    name: string;
  };
}

interface AccountPermission {
  id: string;
  accountUserId: string;
  permissionName: string;
  resource: string;
  action: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

interface UserPermission {
  id: string;
  userId: string;
  permissionName: string;
  resource: string;
  action: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  role: {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
  };
}

export default function PermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("system");

  // Role management state
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([]);
  const [roleTemplate, setRoleTemplate] = useState("");
  const [newRoleApplicableTo, setNewRoleApplicableTo] = useState("system");
  const [newRoleDefaultScope, setNewRoleDefaultScope] = useState("own");

  // Role assignment state
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUsersForRole, setSelectedUsersForRole] = useState<string[]>([]);
  const [selectedRoleForAssignment, setSelectedRoleForAssignment] = useState("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);

  // Account role management state  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountForRoles, setSelectedAccountForRoles] = useState("");

  // Data state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [accountPermissions, setAccountPermissions] = useState<AccountPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  // Form state for creating system permissions
  const [permissionName, setPermissionName] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [permissionResource, setPermissionResource] = useState("");
  const [permissionAction, setPermissionAction] = useState("");
  const [isCreatingPermission, setIsCreatingPermission] = useState(false);

  // Form state for account permissions
  const [selectedAccountUser, setSelectedAccountUser] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [selectedScope, setSelectedScope] = useState("own");
  const [isCreatingAccountPermission, setIsCreatingAccountPermission] = useState(false);

  // Form state for user permissions
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedUserPermission, setSelectedUserPermission] = useState("");
  const [selectedUserScope, setSelectedUserScope] = useState("own");
  const [isCreatingUserPermission, setIsCreatingUserPermission] = useState(false);

  // Seed permissions state
  const [isSeedingPermissions, setIsSeedingPermissions] = useState(false);

  // Data fetching functions
  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const response = await fetch("/api/user-roles");
      if (response.ok) {
        const data = await response.json();
        setUserRoles(data);
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchAccountUsers = async () => {
    try {
      const response = await fetch("/api/account-users");
      if (response.ok) {
        const data = await response.json();
        setAccountUsers(data);
      }
    } catch (error) {
      console.error("Error fetching account users:", error);
    }
  };

  const fetchAccountPermissions = async () => {
    try {
      const response = await fetch("/api/account-permissions");
      if (response.ok) {
        const data = await response.json();
        setAccountPermissions(data);
      }
    } catch (error) {
      console.error("Error fetching account permissions:", error);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch("/api/user-permissions");
      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data);
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins can access permissions management
      if (session.user?.role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        // Load data
        Promise.all([fetchPermissions(), fetchAccountUsers(), fetchAccountPermissions(), fetchUserPermissions(), fetchRoles(), fetchUserRoles(), fetchAccounts()]).then(() => {
          setIsLoading(false);
        });
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

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  const handleCreatePermission = async () => {
    if (isCreatingPermission) return;
    
    setIsCreatingPermission(true);
    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: permissionName,
          description: permissionDescription,
          resource: permissionResource,
          action: permissionAction,
        }),
      });

      if (response.ok) {
        // Reset form and refresh permissions
        setPermissionName("");
        setPermissionDescription("");
        setPermissionResource("");
        setPermissionAction("");
        await fetchPermissions();
      } else {
        const error = await response.json();
        console.error("Error creating permission:", error);
        alert("Failed to create permission: " + error.error);
      }
    } catch (error) {
      console.error("Error creating permission:", error);
      alert("Failed to create permission");
    } finally {
      setIsCreatingPermission(false);
    }
  };

  const handleCreateAccountPermission = async () => {
    if (isCreatingAccountPermission) return;
    
    setIsCreatingAccountPermission(true);
    try {
      const permission = permissions.find(p => p.id === selectedPermission);
      if (!permission) return;

      const response = await fetch("/api/account-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountUserId: selectedAccountUser,
          permissionName: permission.name,
          resource: permission.resource,
          action: permission.action,
          scope: selectedScope,
        }),
      });

      if (response.ok) {
        // Reset form and refresh account permissions
        setSelectedAccountUser("");
        setSelectedPermission("");
        setSelectedScope("own");
        await fetchAccountPermissions();
      } else {
        const error = await response.json();
        console.error("Error creating account permission:", error);
        alert("Failed to create account permission: " + error.error);
      }
    } catch (error) {
      console.error("Error creating account permission:", error);
      alert("Failed to create account permission");
    } finally {
      setIsCreatingAccountPermission(false);
    }
  };

  const handleDeleteAccountPermission = async (permissionId: string) => {
    if (!confirm("Are you sure you want to delete this permission?")) return;

    try {
      const response = await fetch("/api/account-permissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: permissionId }),
      });

      if (response.ok) {
        await fetchAccountPermissions();
      } else {
        const error = await response.json();
        console.error("Error deleting account permission:", error);
        alert("Failed to delete account permission: " + error.error);
      }
    } catch (error) {
      console.error("Error deleting account permission:", error);
      alert("Failed to delete account permission");
    }
  };

  const handleCreateUserPermission = async () => {
    if (isCreatingUserPermission) return;
    
    setIsCreatingUserPermission(true);
    try {
      const permission = permissions.find(p => p.id === selectedUserPermission);
      if (!permission) return;

      const response = await fetch("/api/user-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          permissionName: permission.name,
          resource: permission.resource,
          action: permission.action,
          scope: selectedUserScope,
        }),
      });

      if (response.ok) {
        // Reset form and refresh user permissions
        setSelectedUser("");
        setSelectedUserPermission("");
        setSelectedUserScope("own");
        await fetchUserPermissions();
      } else {
        const error = await response.json();
        console.error("Error creating user permission:", error);
        alert("Failed to create user permission: " + error.error);
      }
    } catch (error) {
      console.error("Error creating user permission:", error);
      alert("Failed to create user permission");
    } finally {
      setIsCreatingUserPermission(false);
    }
  };

  const handleDeleteUserPermission = async (permissionId: string) => {
    if (!confirm("Are you sure you want to delete this permission?")) return;

    try {
      const response = await fetch("/api/user-permissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: permissionId }),
      });

      if (response.ok) {
        await fetchUserPermissions();
      } else {
        const error = await response.json();
        console.error("Error deleting user permission:", error);
        alert("Failed to delete user permission: " + error.error);
      }
    } catch (error) {
      console.error("Error deleting user permission:", error);
      alert("Failed to delete user permission");
    }
  };

  const handleSeedPermissions = async () => {
    if (isSeedingPermissions) return;

    if (!confirm("This will create all permissions from the registry that don't exist in the database. Continue?")) return;
    
    setIsSeedingPermissions(true);
    try {
      const response = await fetch("/api/permissions/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: false }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        await fetchPermissions();
      } else {
        const error = await response.json();
        console.error("Error seeding permissions:", error);
        alert("Failed to seed permissions: " + error.error);
      }
    } catch (error) {
      console.error("Error seeding permissions:", error);
      alert("Failed to seed permissions");
    } finally {
      setIsSeedingPermissions(false);
    }
  };

  const handleCreateRole = async () => {
    if (isCreatingRole || !newRoleName.trim()) return;
    
    setIsCreatingRole(true);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || null,
          permissions: selectedRolePermissions,
          isTemplate: true,
          applicableTo: newRoleApplicableTo,
          defaultScope: newRoleDefaultScope
        }),
      });

      if (response.ok) {
        setNewRoleName("");
        setNewRoleDescription("");
        setSelectedRolePermissions([]);
        setRoleTemplate("");
        setNewRoleApplicableTo("system");
        setNewRoleDefaultScope("own");
        await fetchRoles();
      } else {
        const error = await response.json();
        console.error("Error creating role:", error);
        alert("Failed to create role: " + error.error);
      }
    } catch (error) {
      console.error("Error creating role:", error);
      alert("Failed to create role");
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleApplyRoleTemplate = (templateName: string) => {
    const templatePermissions = DEFAULT_ROLE_PERMISSIONS[templateName as keyof typeof DEFAULT_ROLE_PERMISSIONS];
    if (templatePermissions) {
      const permissionNames = templatePermissions.map(p => `${p.resource}:${p.action}`);
      setSelectedRolePermissions(permissionNames);
      setRoleTemplate(templateName);
      
      // Set applicableTo and defaultScope based on template
      switch (templateName) {
        case 'ADMIN':
        case 'EMPLOYEE':
          setNewRoleApplicableTo('system');
          setNewRoleDefaultScope('own');
          break;
        case 'ACCOUNT_USER':
        case 'ACCOUNT_VIEWER':
          setNewRoleApplicableTo('account');
          setNewRoleDefaultScope('own');
          break;
        case 'ACCOUNT_MANAGER':
          setNewRoleApplicableTo('account');
          setNewRoleDefaultScope('account');
          break;
        case 'SUBSIDIARY_MANAGER':
          setNewRoleApplicableTo('account');
          setNewRoleDefaultScope('subsidiary');
          break;
        default:
          break;
      }
    }
  };

  const handlePermissionToggle = (permissionName: string, checked: boolean) => {
    if (checked) {
      setSelectedRolePermissions(prev => [...prev, permissionName]);
    } else {
      setSelectedRolePermissions(prev => prev.filter(p => p !== permissionName));
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const response = await fetch("/api/roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: roleId }),
      });

      if (response.ok) {
        await fetchRoles();
      } else {
        const error = await response.json();
        console.error("Error deleting role:", error);
        alert("Failed to delete role: " + error.error);
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role");
    }
  };

  const handleAssignRole = async () => {
    if (isAssigningRole || !selectedRoleForAssignment) return;
    
    setIsAssigningRole(true);
    try {
      const response = await fetch("/api/user-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bulk: bulkAssignmentMode,
          userIds: bulkAssignmentMode ? selectedUsersForRole : undefined,
          userId: !bulkAssignmentMode ? selectedUsersForRole[0] : undefined,
          roleId: selectedRoleForAssignment
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (bulkAssignmentMode) {
          alert(result.message || 'Roles assigned successfully');
        }
        setSelectedUsersForRole([]);
        setSelectedRoleForAssignment("");
        setBulkAssignmentMode(false);
        await fetchUserRoles();
      } else {
        const error = await response.json();
        console.error("Error assigning role:", error);
        alert("Failed to assign role: " + error.error);
      }
    } catch (error) {
      console.error("Error assigning role:", error);
      alert("Failed to assign role");
    } finally {
      setIsAssigningRole(false);
    }
  };

  const handleRemoveRoleAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this role assignment?")) return;

    try {
      const response = await fetch("/api/user-roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (response.ok) {
        await fetchUserRoles();
      } else {
        const error = await response.json();
        console.error("Error removing role assignment:", error);
        alert("Failed to remove role assignment: " + error.error);
      }
    } catch (error) {
      console.error("Error removing role assignment:", error);
      alert("Failed to remove role assignment");
    }
  };

  const resourceOptions = [
    "tickets", "time-entries", "accounts", "billing", "reports", "settings"
  ];

  const actionOptions = [
    "view", "create", "update", "delete"
  ];

  const scopeOptions = [
    { value: "own", label: "Own Records Only" },
    { value: "account", label: "Account Records" },
    { value: "subsidiary", label: "Account & Subsidiaries" }
  ];

  return (
    <>

      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access Control</h2>
            <p className="text-muted-foreground">
              Manage system permissions and user access rights.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Permissions</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions.length}</div>
                <p className="text-xs text-muted-foreground">Available permissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Role Templates</CardTitle>
                <Shield className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">Role templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Role Assignments</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userRoles.length}</div>
                <p className="text-xs text-muted-foreground">Users with roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Direct Permissions</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userPermissions.length + accountPermissions.length}</div>
                <p className="text-xs text-muted-foreground">Individual permissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Users</CardTitle>
                <Lock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accountUsers.length}</div>
                <p className="text-xs text-muted-foreground">Users with accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="w-full overflow-x-auto pb-2">
              <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full">
                <TabsTrigger value="system" className="whitespace-nowrap">System Permissions</TabsTrigger>
                <TabsTrigger value="roles" className="whitespace-nowrap">Role Templates</TabsTrigger>
                <TabsTrigger value="assignments" className="whitespace-nowrap">Role Assignments</TabsTrigger>
                <TabsTrigger value="account-roles" className="whitespace-nowrap">Account Roles</TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap">User Permissions</TabsTrigger>
                <TabsTrigger value="account" className="whitespace-nowrap">Account Permissions</TabsTrigger>
                <TabsTrigger value="create" className="whitespace-nowrap">Create Permission</TabsTrigger>
              </TabsList>
            </div>

            {/* System Permissions Tab */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>System Permissions</CardTitle>
                      <CardDescription>
                        Global permissions available in the system. These can be assigned to users.
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleSeedPermissions}
                      disabled={isSeedingPermissions}
                      variant="outline"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isSeedingPermissions ? "Seeding..." : "Seed from Registry"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {permissions.map((permission) => (
                      <Card key={permission.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span className="font-medium">{permission.name}</span>
                                <Badge variant="outline">{permission.resource}</Badge>
                                <Badge variant="secondary">{permission.action}</Badge>
                              </div>
                              
                              {permission.description && (
                                <p className="text-sm text-muted-foreground">{permission.description}</p>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(permission.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Role Templates Tab */}
            <TabsContent value="roles" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Create Role Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create Role Template</CardTitle>
                    <CardDescription>
                      Create reusable role templates with predefined permission sets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input
                        id="role-name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g., Account Manager"
                        disabled={isCreatingRole}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-description">Description</Label>
                      <Textarea
                        id="role-description"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Describe the role's responsibilities..."
                        rows={2}
                        disabled={isCreatingRole}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role-applicable-to">Applicable To</Label>
                        <Select value={newRoleApplicableTo} onValueChange={setNewRoleApplicableTo}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">System Users Only</SelectItem>
                            <SelectItem value="account">Account Users Only</SelectItem>
                            <SelectItem value="both">System & Account Users</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Where this role can be applied
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role-default-scope">Default Scope</Label>
                        <Select value={newRoleDefaultScope} onValueChange={setNewRoleDefaultScope}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="own">Own Records</SelectItem>
                            <SelectItem value="account">Account Level</SelectItem>
                            <SelectItem value="subsidiary">Account + Subsidiaries</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Default permission scope when assigned
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={roleTemplate === 'ADMIN' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('ADMIN')}
                          disabled={isCreatingRole}
                        >
                          Admin Template
                        </Button>
                        <Button
                          type="button"
                          variant={roleTemplate === 'EMPLOYEE' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('EMPLOYEE')}
                          disabled={isCreatingRole}
                        >
                          Employee Template
                        </Button>
                        <Button
                          type="button"
                          variant={roleTemplate === 'ACCOUNT_USER' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('ACCOUNT_USER')}
                          disabled={isCreatingRole}
                        >
                          Account User Template
                        </Button>
                        <Button
                          type="button"
                          variant={roleTemplate === 'ACCOUNT_MANAGER' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('ACCOUNT_MANAGER')}
                          disabled={isCreatingRole}
                        >
                          Account Manager Template
                        </Button>
                        <Button
                          type="button"
                          variant={roleTemplate === 'SUBSIDIARY_MANAGER' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('SUBSIDIARY_MANAGER')}
                          disabled={isCreatingRole}
                        >
                          Subsidiary Manager Template
                        </Button>
                        <Button
                          type="button"
                          variant={roleTemplate === 'ACCOUNT_VIEWER' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleApplyRoleTemplate('ACCOUNT_VIEWER')}
                          disabled={isCreatingRole}
                        >
                          Account Viewer Template
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Permissions ({selectedRolePermissions.length} selected)</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {Object.entries(PERMISSIONS_REGISTRY).map(([category, categoryPerms]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">{category.replace('_', ' ')}</h4>
                            <div className="grid grid-cols-1 gap-2 ml-4">
                              {Object.entries(categoryPerms).map(([, permission]) => {
                                const permissionName = `${permission.resource}:${permission.action}`;
                                const isChecked = selectedRolePermissions.includes(permissionName);
                                return (
                                  <div key={permissionName} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={permissionName}
                                      checked={isChecked}
                                      onCheckedChange={(checked) => handlePermissionToggle(permissionName, checked === true)}
                                      disabled={isCreatingRole}
                                    />
                                    <Label htmlFor={permissionName} className="text-xs flex-1">
                                      {permission.description || permissionName}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={handleCreateRole}
                      disabled={!newRoleName.trim() || selectedRolePermissions.length === 0 || isCreatingRole}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isCreatingRole ? "Creating..." : "Create Role"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Existing Roles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Role Templates</CardTitle>
                    <CardDescription>
                      Manage existing role templates and their permission sets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {roles.map((role) => (
                        <Card key={role.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  <span className="font-medium">{role.name}</span>
                                  {role.isTemplate && <Badge variant="secondary">Template</Badge>}
                                </div>
                                
                                {role.description && (
                                  <p className="text-sm text-muted-foreground">{role.description}</p>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{role.permissions?.length || 0} permissions</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Created: {new Date(role.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteRole(role.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {roles.length === 0 && (
                        <div className="text-center py-8">
                          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                          <h3 className="mt-2 text-sm font-semibold">No roles created</h3>
                          <p className="text-sm text-muted-foreground">Create your first role template to get started.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Role Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Assign Roles Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assign Roles to Users</CardTitle>
                    <CardDescription>
                      Assign role templates to users for bulk permission management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulk-mode"
                        checked={bulkAssignmentMode}
                        onCheckedChange={(checked) => {
                          setBulkAssignmentMode(checked === true);
                          setSelectedUsersForRole([]);
                        }}
                        disabled={isAssigningRole}
                      />
                      <Label htmlFor="bulk-mode" className="text-sm">
                        Bulk assignment mode (select multiple users)
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>Users</Label>
                      {bulkAssignmentMode ? (
                        <MultiUserSelector
                          selectedUserIds={selectedUsersForRole}
                          onSelectionChange={setSelectedUsersForRole}
                          disabled={isAssigningRole}
                          placeholder="Select users to assign role"
                          excludeAccountUsers={true}
                        />
                      ) : (
                        <UserSelector
                          value={selectedUsersForRole[0] || ""}
                          onValueChange={(value) => setSelectedUsersForRole([value])}
                          placeholder="Select user to assign role"
                          excludeAccountUsers={true}
                          className="w-full"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Role Template</Label>
                      <Select value={selectedRoleForAssignment} onValueChange={setSelectedRoleForAssignment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role template to assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name} ({Array.isArray(role.permissions) ? role.permissions.length : 0} permissions)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleAssignRole}
                      disabled={selectedUsersForRole.length === 0 || !selectedRoleForAssignment || isAssigningRole}
                      className="w-full"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      {isAssigningRole ? "Assigning..." : bulkAssignmentMode ? `Assign Role to ${selectedUsersForRole.length} Users` : "Assign Role"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Current Role Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Role Assignments</CardTitle>
                    <CardDescription>
                      View and manage existing role assignments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userRoles.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4" />
                                  <span className="font-medium">{assignment.user.name || assignment.user.email}</span>
                                  <Badge variant={assignment.user.role === 'ADMIN' ? 'destructive' : 'default'}>
                                    {assignment.user.role}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3" />
                                  <span className="text-sm">{assignment.role.name}</span>
                                  <Badge variant="outline">
                                    {Array.isArray(assignment.role.permissions) ? assignment.role.permissions.length : 0} permissions
                                  </Badge>
                                </div>
                                
                                {assignment.role.description && (
                                  <p className="text-xs text-muted-foreground">{assignment.role.description}</p>
                                )}
                                
                                <div className="text-xs text-muted-foreground">
                                  Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleRemoveRoleAssignment(assignment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {userRoles.length === 0 && (
                        <div className="text-center py-8">
                          <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                          <h3 className="mt-2 text-sm font-semibold">No role assignments</h3>
                          <p className="text-sm text-muted-foreground">Assign roles to users to get started.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Account Roles Tab */}
            <TabsContent value="account-roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account User Role Management</CardTitle>
                  <CardDescription>
                    Manage role assignments for account users with scope-based permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Account</Label>
                    <Select value={selectedAccountForRoles} onValueChange={setSelectedAccountForRoles}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select account to manage roles" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts && Array.isArray(accounts) ? accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.accountType})
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAccountForRoles && (
                    <AccountUserRoleManager 
                      accountId={selectedAccountForRoles}
                      onRoleAssigned={() => {
                        // Refresh any necessary data
                        console.log('Role assigned for account:', selectedAccountForRoles);
                      }}
                    />
                  )}

                  {!selectedAccountForRoles && (
                    <div className="text-center py-8">
                      <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-semibold">Select an Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose an account to manage user roles and permissions.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Permissions Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System User Permissions</CardTitle>
                  <CardDescription>
                    Permissions assigned to system users (ADMIN and EMPLOYEE roles).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="space-y-2">
                        <Label>User</Label>
                        <UserSelector
                          value={selectedUser}
                          onValueChange={setSelectedUser}
                          placeholder="Select user to assign permission"
                          excludeAccountUsers={true}
                          className="w-[250px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Permission</Label>
                        <Select value={selectedUserPermission} onValueChange={setSelectedUserPermission}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select permission" />
                          </SelectTrigger>
                          <SelectContent>
                            {permissions.map(permission => (
                              <SelectItem key={permission.id} value={permission.id}>
                                {permission.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Scope</Label>
                        <Select value={selectedUserScope} onValueChange={setSelectedUserScope}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {scopeOptions.map(scope => (
                              <SelectItem key={scope.value} value={scope.value}>
                                {scope.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button 
                          onClick={handleCreateUserPermission}
                          disabled={!selectedUser || !selectedUserPermission || isCreatingUserPermission}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {isCreatingUserPermission ? "Assigning..." : "Assign Permission"}
                        </Button>
                      </div>
                    </div>

                    {userPermissions.map((permission) => (
                      <Card key={permission.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                <span className="font-medium">{permission.permissionName}</span>
                                <Badge variant="outline">{permission.resource}</Badge>
                                <Badge variant="secondary">{permission.action}</Badge>
                                <Badge variant="default">{permission.scope}</Badge>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span className="text-sm">{permission.user.name || permission.user.email}</span>
                                <Badge variant={permission.user.role === 'ADMIN' ? 'destructive' : 'default'}>
                                  {permission.user.role}
                                </Badge>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(permission.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteUserPermission(permission.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Permissions Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account User Permissions</CardTitle>
                  <CardDescription>
                    Permissions assigned to specific account users.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className="space-y-2">
                        <Label>Account User</Label>
                        <Select value={selectedAccountUser} onValueChange={setSelectedAccountUser}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select user to assign permission" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountUsers.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.account.name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Permission</Label>
                        <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select permission" />
                          </SelectTrigger>
                          <SelectContent>
                            {permissions.map(permission => (
                              <SelectItem key={permission.id} value={permission.id}>
                                {permission.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Scope</Label>
                        <Select value={selectedScope} onValueChange={setSelectedScope}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {scopeOptions.map(scope => (
                              <SelectItem key={scope.value} value={scope.value}>
                                {scope.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button 
                          onClick={handleCreateAccountPermission}
                          disabled={!selectedAccountUser || !selectedPermission || isCreatingAccountPermission}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {isCreatingAccountPermission ? "Assigning..." : "Assign Permission"}
                        </Button>
                      </div>
                    </div>

                    {accountPermissions.map((permission) => (
                      <Card key={permission.id}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                <span className="font-medium">{permission.permissionName}</span>
                                <Badge variant="outline">{permission.resource}</Badge>
                                <Badge variant="secondary">{permission.action}</Badge>
                                <Badge variant="default">{permission.scope}</Badge>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                User ID: {permission.accountUserId} | 
                                Created: {new Date(permission.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteAccountPermission(permission.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Create Permission Tab */}
            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create System Permission</CardTitle>
                  <CardDescription>
                    Create a new system-wide permission that can be assigned to account users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="permission-name">Permission Name</Label>
                      <Input
                        id="permission-name"
                        value={permissionName}
                        onChange={(e) => setPermissionName(e.target.value)}
                        placeholder="e.g., view_tickets"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="permission-resource">Resource</Label>
                      <Select value={permissionResource} onValueChange={setPermissionResource}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource" />
                        </SelectTrigger>
                        <SelectContent>
                          {resourceOptions.map(resource => (
                            <SelectItem key={resource} value={resource}>
                              {resource}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="permission-action">Action</Label>
                      <Select value={permissionAction} onValueChange={setPermissionAction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptions.map(action => (
                            <SelectItem key={action} value={action}>
                              {action}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="permission-description">Description (Optional)</Label>
                    <Textarea
                      id="permission-description"
                      value={permissionDescription}
                      onChange={(e) => setPermissionDescription(e.target.value)}
                      placeholder="Describe what this permission allows..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <Button 
                    onClick={handleCreatePermission}
                    disabled={!permissionName || !permissionResource || !permissionAction || isCreatingPermission}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreatingPermission ? "Creating..." : "Create Permission"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}