"use client";

import { useSession, signOut } from "next-auth/react";
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
  LogOut, 
  ArrowLeft,
  Users,
  Edit,
  Trash2,
  UserCheck,
  Lock
} from "lucide-react";

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

export default function PermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("system");

  // Data state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [accountPermissions, setAccountPermissions] = useState<AccountPermission[]>([]);

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      // Only admins can access permissions management
      if (session.user?.role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        // Load data
        Promise.all([fetchPermissions(), fetchAccountUsers(), fetchAccountPermissions()]).then(() => {
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
            <Shield className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Permissions Management</h1>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.name || session.user?.email}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-sm font-medium">Account Users</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accountUsers.length}</div>
                <p className="text-xs text-muted-foreground">Users with accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Permissions</CardTitle>
                <UserCheck className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accountPermissions.length}</div>
                <p className="text-xs text-muted-foreground">Assigned permissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resources</CardTitle>
                <Lock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resourceOptions.length}</div>
                <p className="text-xs text-muted-foreground">Protected resources</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="system">System Permissions</TabsTrigger>
              <TabsTrigger value="account">Account Permissions</TabsTrigger>
              <TabsTrigger value="create">Create Permission</TabsTrigger>
            </TabsList>

            {/* System Permissions Tab */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Permissions</CardTitle>
                  <CardDescription>
                    Global permissions available in the system. These can be assigned to account users.
                  </CardDescription>
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
    </div>
  );
}