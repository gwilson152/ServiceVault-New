/**
 * System Role Management Dialog
 * 
 * Dedicated interface for managing system-wide roles for users:
 * - View current system roles
 * - Add new system roles  
 * - Remove system roles
 * - View system role permissions
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
  Shield,
  Plus,
  Trash2,
  AlertTriangle,
  Eye,
  Loader2,
  Crown,
  Settings
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

interface SystemRole {
  role: RoleTemplate;
}

interface SystemRoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  systemRoles: SystemRole[];
  onRoleChanged: () => void;
}

export function SystemRoleManagementDialog({
  open,
  onOpenChange,
  userId,
  userName,
  systemRoles,
  onRoleChanged
}: SystemRoleManagementDialogProps) {
  const [availableRoles, setAvailableRoles] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [showConfirmRemoval, setShowConfirmRemoval] = useState<{
    roleId: string;
    roleName: string;
  } | null>(null);

  const { toast } = useToast();
  const { canEditUsers, isSuperAdmin } = usePermissions();

  useEffect(() => {
    if (open) {
      loadAvailableRoles();
    }
  }, [open, systemRoles]);

  const loadAvailableRoles = async () => {
    try {
      const response = await fetch('/api/role-templates');
      if (response.ok) {
        const data = await response.json();
        const roles = data.roleTemplates || data;
        const roleList = Array.isArray(roles) ? roles : [];
        
        // Filter out roles that the user already has
        const existingRoleIds = systemRoles.map(sr => sr.role.id);
        const availableRoleList = roleList.filter(role => !existingRoleIds.includes(role.id));
        
        setAvailableRoles(availableRoleList);
      } else {
        console.error('Failed to load available roles:', response.status);
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error('Failed to load available roles:', error);
      setAvailableRoles([]);
    }
  };

  const handleAddSystemRole = async () => {
    if (!selectedRoleId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/system-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add system role');
      }

      toast({
        title: "Success",
        description: "System role added successfully"
      });

      setSelectedRoleId("");
      onRoleChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add system role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSystemRole = async (roleId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/system-roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove system role');
      }

      toast({
        title: "Success",
        description: "System role removed successfully"
      });

      onRoleChanged();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove system role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmRemoval(null);
    }
  };

  const groupPermissionsByResource = (permissions: RoleTemplate['permissions']) => {
    const grouped: Record<string, RoleTemplate['permissions']> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  if (!canEditUsers && !isSuperAdmin) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-orange-500" />
              Manage System Roles - {userName}
            </DialogTitle>
            <DialogDescription>
              Manage system-wide roles that grant global permissions to this user.
              System roles apply across all accounts and override account-specific roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add System Role Section */}
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add System Role
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Select
                    value={selectedRoleId}
                    onValueChange={setSelectedRoleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select system role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            {role.inheritAllPermissions && (
                              <Crown className="h-3 w-3 text-orange-500" />
                            )}
                            <span>{role.name}</span>
                            {role.inheritAllPermissions && (
                              <Badge variant="secondary" className="text-xs">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {availableRoles.length === 0 && (
                        <SelectItem value="none" disabled>
                          No available roles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddSystemRole}
                  disabled={!selectedRoleId || loading || selectedRoleId === "none"}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Role
                </Button>
              </div>
              {availableRoles.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  All available system roles are already assigned to this user.
                </p>
              )}
            </div>

            {/* Current System Roles */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Current System Roles ({systemRoles.length})
              </h3>

              {systemRoles.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No system roles assigned</p>
                  <p className="text-sm text-gray-400">
                    User only has account-specific permissions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemRoles.map((systemRole, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-amber-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {systemRole.role.inheritAllPermissions ? (
                            <Crown className="h-5 w-5 text-orange-500" />
                          ) : (
                            <Shield className="h-5 w-5 text-blue-500" />
                          )}
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {systemRole.role.name}
                              {systemRole.role.inheritAllPermissions && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  Super Admin
                                </Badge>
                              )}
                            </h4>
                            {systemRole.role.description && (
                              <p className="text-sm text-gray-600">
                                {systemRole.role.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowConfirmRemoval({
                            roleId: systemRole.role.id,
                            roleName: systemRole.role.name,
                          })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Role Permissions */}
                      {systemRole.role.inheritAllPermissions ? (
                        <Alert>
                          <Crown className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Super Administrator:</strong> This role grants full system access with all permissions.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-3">
                          <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Granted Permissions
                          </h5>
                          {Object.entries(groupPermissionsByResource(systemRole.role.permissions)).map(([resource, permissions]) => (
                            <div key={resource} className="space-y-1">
                              <h6 className="text-sm font-medium capitalize">
                                {resource.replace('-', ' ')}
                              </h6>
                              <div className="flex flex-wrap gap-1">
                                {permissions.map((permission, permIndex) => (
                                  <Badge 
                                    key={permIndex} 
                                    variant="outline" 
                                    className="text-xs bg-blue-50 border-blue-200 text-blue-700"
                                  >
                                    {permission.action === '*' ? 'All Actions' : permission.action}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                Remove System Role
              </DialogTitle>
              <DialogDescription>
                Remove the system role "{showConfirmRemoval.roleName}" from {userName}?
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Removing this system role will revoke all global permissions 
                granted by this role. The user will only retain permissions from their account memberships.
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
                  if (showConfirmRemoval) {
                    handleRemoveSystemRole(showConfirmRemoval.roleId);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove System Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}