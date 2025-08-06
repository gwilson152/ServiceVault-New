/**
 * Role Template Management Page
 * 
 * Provides comprehensive interface for managing role templates:
 * - View all role templates with usage statistics
 * - Create new role templates with permission matrix
 * - Edit existing role templates
 * - Delete unused role templates
 * - Super-admin flag management with warnings
 * 
 * Features:
 * - Permission matrix interface for easy assignment
 * - Usage tracking (account memberships + system roles)
 * - Super-admin controls with appropriate warnings
 * - Role template duplication for customization
 * - Search and filtering capabilities
 * 
 * Integration:
 * - Uses /api/role-templates for CRUD operations
 * - Integrates with PermissionService for access control
 * - Links to user management for role assignments
 * - Follows established admin page patterns
 * 
 * Security:
 * - Super-admin only access (role-templates:view permission)
 * - Prevents deletion of roles in use
 * - Validates permission format and business rules
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Copy,
  Users,
  AlertTriangle,
  Crown,
  Building,
  Globe,
  Search,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleTemplate {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  inheritAllPermissions: boolean;
  isSystemRole: boolean;
  scope: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    membershipRoles: number;
    systemRoles: number;
  };
}

// Available permissions grouped by resource
const PERMISSION_GROUPS = {
  'accounts': ['view', 'create', 'edit', 'delete', 'update'],
  'users': ['view', 'create', 'edit', 'delete', 'invite'],
  'time-entries': ['view', 'create', 'edit', 'delete', 'update', 'approve'],
  'tickets': ['view', 'create', 'edit', 'delete', 'update', 'assignable-to', 'assignable-for'],
  'invoices': ['view', 'create', 'edit', 'delete', 'send'],
  'billing': ['view', 'create', 'edit'],
  'reports': ['view', 'export'],
  'settings': ['view', 'edit'],
  'account-settings': ['view', 'update'],
  'role-templates': ['view', 'create', 'edit', 'delete']
};

// Helper function to get descriptive labels for permissions
const getPermissionLabel = (resource: string, action: string): string => {
  if (resource === 'tickets' && action === 'assignable-to') {
    return 'assignable to (can be assigned tickets)';
  }
  if (resource === 'tickets' && action === 'assignable-for') {
    return 'assignable for (tickets can be created for this user)';
  }
  return action.replace('-', ' ');
};

export default function RoleTemplatesPage() {
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    inheritAllPermissions: false,
    isSystemRole: false,
    scope: "account"
  });

  const { toast } = useToast();
  const { canViewRoleTemplates } = usePermissions();

  useEffect(() => {
    loadRoleTemplates();
  }, []);

  const loadRoleTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/role-templates?includeUsage=true');
      if (response.ok) {
        const data = await response.json();
        setRoleTemplates(data.roleTemplates);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to load role templates",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load role templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      permissions: [],
      inheritAllPermissions: false,
      isSystemRole: false,
      scope: "account"
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (role: RoleTemplate) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: [...role.permissions],
      inheritAllPermissions: role.inheritAllPermissions,
      isSystemRole: role.isSystemRole,
      scope: role.scope
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (role: RoleTemplate) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const duplicateRole = (role: RoleTemplate) => {
    setFormData({
      name: `${role.name} (Copy)`,
      description: role.description || "",
      permissions: [...role.permissions],
      inheritAllPermissions: role.inheritAllPermissions,
      isSystemRole: role.isSystemRole,
      scope: role.scope
    });
    setShowCreateDialog(true);
  };

  const handlePermissionToggle = (resource: string, action: string) => {
    const permission = `${resource}:${action}`;
    const newPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const url = showEditDialog ? `/api/role-templates/${selectedRole?.id}` : '/api/role-templates';
      const method = showEditDialog ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message
        });
        
        setShowCreateDialog(false);
        setShowEditDialog(false);
        loadRoleTemplates();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save role template",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save role template",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/role-templates/${selectedRole.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message
        });
        
        setShowDeleteDialog(false);
        loadRoleTemplates();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete role template",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete role template",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roleTemplates.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: RoleTemplate) => {
    if (role.inheritAllPermissions) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (role.isSystemRole) return <Globe className="h-4 w-4 text-blue-500" />;
    return <Building className="h-4 w-4 text-gray-500" />;
  };

  const getTotalUsage = (role: RoleTemplate) => {
    if (!role._count) return 0;
    return role._count.membershipRoles + role._count.systemRoles;
  };

  // Check if user has super-admin permissions
  if (!canViewRoleTemplates) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Super-admin permissions required to manage role templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage role templates and permissions for your organization
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Role Template
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search role templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Role Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role)}
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateRole(role)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(role)}
                      disabled={getTotalUsage(role) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {getTotalUsage(role)} users assigned
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {role.inheritAllPermissions ? (
                      <Badge variant="destructive" className="text-xs">
                        Super Admin
                      </Badge>
                    ) : (
                      <>
                        {role.isSystemRole && (
                          <Badge variant="secondary" className="text-xs">
                            System Role
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {role.permissions.length} permissions
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Edit Role Template' : 'Create Role Template'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog 
                ? 'Update the role template settings and permissions'
                : 'Define a new role template with specific permissions'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter role name"
                  maxLength={100}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this role"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.inheritAllPermissions}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, inheritAllPermissions: checked })
                  }
                />
                <Label className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Super Admin (Inherits ALL permissions)
                </Label>
              </div>

              {formData.inheritAllPermissions && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Super admin roles bypass all permission checks and have unrestricted access to the entire system.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isSystemRole}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isSystemRole: checked })
                  }
                />
                <Label>System-wide role (can be assigned globally)</Label>
              </div>

              <div>
                <Label>Scope</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(value) => setFormData({ ...formData, scope: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions Matrix */}
            {!formData.inheritAllPermissions && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Permissions</h3>
                  <div className="space-y-4">
                    {Object.entries(PERMISSION_GROUPS).map(([resource, actions]) => (
                      <div key={resource} className="border rounded-lg p-4">
                        <h4 className="font-medium capitalize mb-3">{resource.replace('-', ' ')}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {actions.map((action) => {
                            const permission = `${resource}:${action}`;
                            return (
                              <div key={permission} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={formData.permissions.includes(permission)}
                                  onCheckedChange={() => handlePermissionToggle(resource, action)}
                                />
                                <Label className="text-sm capitalize">{getPermissionLabel(resource, action)}</Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {showEditDialog ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Role Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role template "{selectedRole?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRole && getTotalUsage(selectedRole) > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This role template is currently assigned to {getTotalUsage(selectedRole)} user(s) and cannot be deleted.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={submitting || (selectedRole && getTotalUsage(selectedRole) > 0)}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}