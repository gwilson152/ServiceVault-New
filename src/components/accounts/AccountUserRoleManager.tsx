"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCheck, Shield, Trash2, Plus, Users, AlertCircle } from "lucide-react";

interface AccountUser {
  id: string;
  name: string;
  email: string;
  account: {
    id: string;
    name: string;
    accountType: string;
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  applicableTo: string;
  defaultScope: string;
}

interface AccountUserRole {
  id: string;
  accountUserId: string;
  roleId: string;
  scope: string;
  createdAt: string;
  accountUser: AccountUser;
  role: Role;
}

interface AccountUserRoleManagerProps {
  accountId: string;
  onRoleAssigned?: () => void;
  className?: string;
}

export function AccountUserRoleManager({ 
  accountId, 
  onRoleAssigned,
  className = "" 
}: AccountUserRoleManagerProps) {
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accountUserRoles, setAccountUserRoles] = useState<AccountUserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAccountUsers, setSelectedAccountUsers] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedScope, setSelectedScope] = useState("account");
  const [isAssigning, setIsAssigning] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    if (accountId) {
      fetchData();
    }
  }, [accountId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchAccountUsers(),
        fetchAccountApplicableRoles(),
        fetchAccountUserRoles()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountUsers = async () => {
    try {
      const response = await fetch(`/api/account-users?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccountUsers(data);
      }
    } catch (error) {
      console.error('Error fetching account users:', error);
    }
  };

  const fetchAccountApplicableRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        // Filter roles that are applicable to account users
        const applicableRoles = data.filter((role: Role) => 
          role.applicableTo === 'account' || role.applicableTo === 'both'
        );
        setRoles(applicableRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchAccountUserRoles = async () => {
    try {
      const response = await fetch(`/api/account-user-roles?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccountUserRoles(data);
      }
    } catch (error) {
      console.error('Error fetching account user roles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (isAssigning || selectedAccountUsers.length === 0 || !selectedRole) return;
    
    setIsAssigning(true);
    try {
      const response = await fetch('/api/account-user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bulk: bulkMode,
          accountUserIds: bulkMode ? selectedAccountUsers : undefined,
          accountUserId: !bulkMode ? selectedAccountUsers[0] : undefined,
          roleId: selectedRole,
          scope: selectedScope
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (bulkMode) {
          alert(result.message || 'Roles assigned successfully');
        }
        
        // Reset form
        setSelectedAccountUsers([]);
        setSelectedRole("");
        setSelectedScope("account");
        setBulkMode(false);
        setIsAssignDialogOpen(false);
        
        // Refresh data
        await fetchAccountUserRoles();
        onRoleAssigned?.();
      } else {
        const error = await response.json();
        console.error('Error assigning role:', error);
        alert('Failed to assign role: ' + error.error);
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Failed to assign role');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRole = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this role assignment?')) return;

    try {
      const response = await fetch('/api/account-user-roles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: assignmentId }),
      });

      if (response.ok) {
        await fetchAccountUserRoles();
        onRoleAssigned?.();
      } else {
        const error = await response.json();
        console.error('Error removing role:', error);
        alert('Failed to remove role: ' + error.error);
      }
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Failed to remove role');
    }
  };

  const handleAccountUserToggle = (accountUserId: string) => {
    setSelectedAccountUsers(prev => {
      if (prev.includes(accountUserId)) {
        return prev.filter(id => id !== accountUserId);
      } else {
        return bulkMode ? [...prev, accountUserId] : [accountUserId];
      }
    });
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'own': return 'Own Records';
      case 'account': return 'Account Level';
      case 'subsidiary': return 'Account + Subsidiaries';
      default: return scope;
    }
  };

  const getScopeBadgeVariant = (scope: string) => {
    switch (scope) {
      case 'own': return 'secondary';
      case 'account': return 'default';
      case 'subsidiary': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading account user roles...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Role Assignments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account User Roles</CardTitle>
              <CardDescription>
                Manage role assignments for account users with scope-based permissions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAssignDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accountUserRoles.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span className="font-medium">{assignment.accountUser.name}</span>
                        <Badge variant="outline">{assignment.accountUser.email}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        <span className="text-sm">{assignment.role.name}</span>
                        <Badge variant={getScopeBadgeVariant(assignment.scope)}>
                          {getScopeLabel(assignment.scope)}
                        </Badge>
                        <Badge variant="secondary">
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
                        onClick={() => handleRemoveRole(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {accountUserRoles.length === 0 && (
              <div className="text-center py-8">
                <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No role assignments</h3>
                <p className="text-sm text-muted-foreground">Assign roles to account users to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign Role to Account Users</DialogTitle>
            <DialogDescription>
              Assign roles to account users with specific permission scopes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bulk Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-mode"
                checked={bulkMode}
                onCheckedChange={(checked) => {
                  setBulkMode(checked === true);
                  setSelectedAccountUsers([]);
                }}
                disabled={isAssigning}
              />
              <Label htmlFor="bulk-mode" className="text-sm">
                Bulk assignment mode (select multiple users)
              </Label>
            </div>

            {/* Account Users Selection */}
            <div className="space-y-2">
              <Label>Account Users {bulkMode && `(${selectedAccountUsers.length} selected)`}</Label>
              <ScrollArea className="h-[200px] border rounded-md p-3">
                <div className="space-y-2">
                  {accountUsers.map(accountUser => (
                    <div key={accountUser.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                      <Checkbox
                        id={`user-${accountUser.id}`}
                        checked={selectedAccountUsers.includes(accountUser.id)}
                        onCheckedChange={() => handleAccountUserToggle(accountUser.id)}
                        disabled={isAssigning}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`user-${accountUser.id}`} className="text-sm cursor-pointer">
                          {accountUser.name}
                        </Label>
                        <div className="text-xs text-muted-foreground">{accountUser.email}</div>
                      </div>
                    </div>
                  ))}
                  
                  {accountUsers.length === 0 && (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">No account users found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Role Template</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role to assign" />
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

            {/* Scope Selection */}
            <div className="space-y-2">
              <Label>Permission Scope</Label>
              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own Records Only</SelectItem>
                  <SelectItem value="account">Account Level</SelectItem>
                  <SelectItem value="subsidiary">Account + Subsidiaries</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Defines the scope of permissions granted by this role assignment
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignRole}
              disabled={selectedAccountUsers.length === 0 || !selectedRole || isAssigning}
            >
              {isAssigning ? 'Assigning...' : bulkMode ? `Assign to ${selectedAccountUsers.length} Users` : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}