/**
 * User Role Management Dialog
 * 
 * Comprehensive role management interface for user account memberships:
 * - View current roles within account memberships
 * - Add new roles to existing memberships
 * - Remove roles from memberships
 * - Remove user from accounts entirely
 * - View effective permissions
 * 
 * Features:
 * - Permission-based access control
 * - Role selection with availability filtering
 * - Confirmation dialogs for destructive actions
 * - Real-time updates after changes
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  Building,
  Eye,
  Loader2,
  UserX
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleTemplate {
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
}

interface AccountMembership {
  id: string;
  account: {
    id: string;
    name: string;
    accountType: string;
  };
  roles: {
    id: string;
    role: RoleTemplate;
  }[];
}

interface UserRoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  memberships: AccountMembership[];
  onRoleChanged: () => void;
}

export function UserRoleManagementDialog({
  open,
  onOpenChange,
  userId,
  userName,
  memberships,
  onRoleChanged
}: UserRoleManagementDialogProps) {
  const [availableRoles, setAvailableRoles] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<AccountMembership | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [showConfirmRemoval, setShowConfirmRemoval] = useState<{
    type: 'role' | 'membership';
    membershipId: string;
    roleId?: string;
    accountName: string;
    roleName?: string;
  } | null>(null);
  const [effectivePermissions, setEffectivePermissions] = useState<{
    resource: string;
    action: string;
    scope: string;
  }[]>([]);

  const { toast } = useToast();
  const { canEditUsers } = usePermissions();

  useEffect(() => {
    if (open) {
      loadAvailableRoles();
      loadEffectivePermissions();
    }
  }, [open, userId]);

  const loadAvailableRoles = async () => {
    try {
      const response = await fetch('/api/role-templates');
      if (response.ok) {
        const data = await response.json();
        const roles = data.roleTemplates || data;
        setAvailableRoles(Array.isArray(roles) ? roles : []);
      } else {
        console.error('Failed to load available roles:', response.status);
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error('Failed to load available roles:', error);
      setAvailableRoles([]);
    }
  };

  const loadEffectivePermissions = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/effective-permissions`);
      if (response.ok) {
        const permissions = await response.json();
        setEffectivePermissions(Array.isArray(permissions) ? permissions : []);
      } else {
        console.error('Failed to load effective permissions:', response.status);
        setEffectivePermissions([]);
      }
    } catch (error) {
      console.error('Failed to load effective permissions:', error);
      setEffectivePermissions([]);
    }
  };

  const handleAddRole = async () => {
    if (!selectedMembership || !selectedRoleId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/membership-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: selectedMembership.id,
          roleId: selectedRoleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add role');
      }

      toast({
        title: "Success",
        description: "Role added successfully"
      });

      setSelectedRoleId("");
      setSelectedMembership(null);
      onRoleChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (membershipId: string, roleId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/membership-roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId,
          roleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove role');
      }

      toast({
        title: "Success",
        description: "Role removed successfully"
      });

      onRoleChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmRemoval(null);
    }
  };

  const handleRemoveFromAccount = async (membershipId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/memberships/${membershipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove user from account');
      }

      toast({
        title: "Success",
        description: "User removed from account successfully"
      });

      onRoleChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user from account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmRemoval(null);
    }
  };

  const getAvailableRolesForMembership = (membership: AccountMembership) => {
    const existingRoleIds = membership.roles.map(r => r.role.id);
    return (availableRoles || []).filter(role => !existingRoleIds.includes(role.id));
  };

  const groupPermissionsByResource = (permissions: typeof effectivePermissions) => {
    const grouped: Record<string, typeof permissions> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  if (!canEditUsers) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage User Roles - {userName}
            </DialogTitle>
            <DialogDescription>
              Manage account memberships, role assignments, and view effective permissions for this user.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="memberships" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="memberships">
                Account Memberships ({memberships.length})
              </TabsTrigger>
              <TabsTrigger value="permissions">
                Effective Permissions ({effectivePermissions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memberships" className="space-y-4">
              {/* Add Role Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Add Role to Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Select
                      value={selectedMembership?.id || ""}
                      onValueChange={(value) => {
                        const membership = memberships.find(m => m.id === value);
                        setSelectedMembership(membership || null);
                        setSelectedRoleId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {memberships.map((membership) => (
                          <SelectItem key={membership.id} value={membership.id}>
                            {membership.account.name} ({membership.account.accountType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select
                      value={selectedRoleId}
                      onValueChange={setSelectedRoleId}
                      disabled={!selectedMembership}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedMembership && getAvailableRolesForMembership(selectedMembership).map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                            {role.inheritAllPermissions && " (Super Admin)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button
                      onClick={handleAddRole}
                      disabled={!selectedMembership || !selectedRoleId || loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add Role
                    </Button>
                  </div>
                </div>
              </div>

              {/* Current Memberships */}
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <div key={membership.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <h3 className="font-medium">{membership.account.name}</h3>
                        <Badge variant="outline">{membership.account.accountType}</Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowConfirmRemoval({
                          type: 'membership',
                          membershipId: membership.id,
                          accountName: membership.account.name,
                        })}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Remove from Account
                      </Button>
                    </div>

                    {membership.roles.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>No roles assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {membership.roles.map((membershipRole) => (
                          <div
                            key={membershipRole.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={membershipRole.role.inheritAllPermissions ? "default" : "outline"}
                              >
                                {membershipRole.role.name}
                                {membershipRole.role.inheritAllPermissions && " (Super Admin)"}
                              </Badge>
                              {membershipRole.role.description && (
                                <span className="text-sm text-gray-600">
                                  {membershipRole.role.description}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowConfirmRemoval({
                                type: 'role',
                                membershipId: membership.id,
                                roleId: membershipRole.id,
                                accountName: membership.account.name,
                                roleName: membershipRole.role.name,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {memberships.length === 0 && (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No account memberships</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  These are the effective permissions this user has across all their account memberships and system roles.
                </AlertDescription>
              </Alert>

              {effectivePermissions.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No effective permissions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupPermissionsByResource(effectivePermissions)).map(([resource, permissions]) => (
                    <div key={resource} className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3 capitalize">{resource} Permissions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {permissions.map((permission, index) => (
                          <Badge key={index} variant="outline">
                            {permission.action}
                            {permission.scope !== 'GLOBAL' && ` (${permission.scope})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {showConfirmRemoval && (
        <Dialog open={true} onOpenChange={() => setShowConfirmRemoval(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {showConfirmRemoval.type === 'role' ? 'Remove Role' : 'Remove from Account'}
              </DialogTitle>
              <DialogDescription>
                {showConfirmRemoval.type === 'role' 
                  ? `Remove the role "${showConfirmRemoval.roleName}" from ${userName}'s membership in "${showConfirmRemoval.accountName}"?`
                  : `Remove ${userName} from the account "${showConfirmRemoval.accountName}" entirely? This will remove all role assignments for this account.`
                }
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. The user will lose any permissions granted by this {showConfirmRemoval.type === 'role' ? 'role' : 'account membership'}.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmRemoval(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (showConfirmRemoval.type === 'role' && showConfirmRemoval.roleId) {
                    handleRemoveRole(showConfirmRemoval.membershipId, showConfirmRemoval.roleId);
                  } else {
                    handleRemoveFromAccount(showConfirmRemoval.membershipId);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {showConfirmRemoval.type === 'role' ? 'Remove Role' : 'Remove from Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}