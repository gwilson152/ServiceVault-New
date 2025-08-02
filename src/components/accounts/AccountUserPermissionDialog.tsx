"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Eye, 
  Plus, 
  Users, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Building,
  FileText,
  Mail,
  Clock
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { AccountUserWithStatus } from "@/types/account-user";

interface AccountUserPermissionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountUser: AccountUserWithStatus | null;
  onPermissionsUpdated: () => void;
}

interface PermissionSet {
  canViewOwnTickets: boolean;
  canViewAccountTickets: boolean;
  canCreateTickets: boolean;
  canManageAccountUsers: boolean;
  canViewTimeEntries: boolean;
  canViewInvoices: boolean;
  canReceiveNotifications: boolean;
}

const defaultPermissions: PermissionSet = {
  canViewOwnTickets: true,
  canViewAccountTickets: false,
  canCreateTickets: true,
  canManageAccountUsers: false,
  canViewTimeEntries: false,
  canViewInvoices: false,
  canReceiveNotifications: true,
};

const permissionTemplates = {
  basic: {
    name: "Basic User",
    description: "Can view own tickets and create new ones",
    permissions: {
      canViewOwnTickets: true,
      canViewAccountTickets: false,
      canCreateTickets: true,
      canManageAccountUsers: false,
      canViewTimeEntries: false,
      canViewInvoices: false,
      canReceiveNotifications: true,
    }
  },
  manager: {
    name: "Account Manager",
    description: "Full access to account tickets and user management",
    permissions: {
      canViewOwnTickets: true,
      canViewAccountTickets: true,
      canCreateTickets: true,
      canManageAccountUsers: true,
      canViewTimeEntries: true,
      canViewInvoices: true,
      canReceiveNotifications: true,
    }
  },
  viewer: {
    name: "View Only",
    description: "Can only view assigned tickets",
    permissions: {
      canViewOwnTickets: true,
      canViewAccountTickets: false,
      canCreateTickets: false,
      canManageAccountUsers: false,
      canViewTimeEntries: false,
      canViewInvoices: false,
      canReceiveNotifications: false,
    }
  }
};

export function AccountUserPermissionDialog({
  isOpen,
  onOpenChange,
  accountUser,
  onPermissionsUpdated
}: AccountUserPermissionDialogProps) {
  const [permissions, setPermissions] = useState<PermissionSet>(defaultPermissions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  
  const { canUpdateUsers } = usePermissions();

  // Load account user permissions when dialog opens
  useEffect(() => {
    if (accountUser?.permissions) {
      setPermissions({
        canViewOwnTickets: accountUser.permissions.canViewOwnTickets ?? true,
        canViewAccountTickets: accountUser.permissions.canViewAccountTickets ?? false,
        canCreateTickets: accountUser.permissions.canCreateTickets ?? true,
        canManageAccountUsers: accountUser.permissions.canManageAccountUsers ?? false,
        canViewTimeEntries: accountUser.permissions.canViewTimeEntries ?? false,
        canViewInvoices: accountUser.permissions.canViewInvoices ?? false,
        canReceiveNotifications: accountUser.permissions.canReceiveNotifications ?? true,
      });
    } else {
      setPermissions(defaultPermissions);
    }
    setSubmitStatus('idle');
    setErrorMessage("");
  }, [accountUser]);

  const handleClose = () => {
    setSubmitStatus('idle');
    setErrorMessage("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!accountUser) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage("");

    try {
      const response = await fetch(`/api/account-users/${accountUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: permissions
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          onPermissionsUpdated();
          handleClose();
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Failed to update permissions');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setErrorMessage('Failed to update permissions. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (key: keyof PermissionSet, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyTemplate = (templateKey: keyof typeof permissionTemplates) => {
    const template = permissionTemplates[templateKey];
    setPermissions(template.permissions);
  };

  const getPermissionIcon = (permissionKey: string) => {
    switch (permissionKey) {
      case 'canViewOwnTickets':
      case 'canViewAccountTickets':
        return <Eye className="h-4 w-4" />;
      case 'canCreateTickets':
        return <Plus className="h-4 w-4" />;
      case 'canManageAccountUsers':
        return <Users className="h-4 w-4" />;
      case 'canViewTimeEntries':
        return <Clock className="h-4 w-4" />;
      case 'canViewInvoices':
        return <FileText className="h-4 w-4" />;
      case 'canReceiveNotifications':
        return <Mail className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (!accountUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Manage Permissions</span>
          </DialogTitle>
          <DialogDescription>
            Configure detailed permissions for <strong>{accountUser.name}</strong> in <strong>{accountUser.account?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-background rounded-full">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{accountUser.name}</p>
              <p className="text-sm text-muted-foreground">{accountUser.email}</p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline">{accountUser.account?.name}</Badge>
            </div>
          </div>

          {/* Permission Templates */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Permission Templates</Label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(permissionTemplates).map(([key, template]) => (
                <Button
                  key={key}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-start"
                  onClick={() => applyTemplate(key as keyof typeof permissionTemplates)}
                  disabled={isSubmitting}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground text-left mt-1">
                    {template.description}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Detailed Permissions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Detailed Permissions</Label>
            
            {/* Ticket Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Ticket Management</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Control access to support tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canViewOwnTickets" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canViewOwnTickets')}
                      <span>View Own Tickets</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      View tickets created by or assigned to this user
                    </div>
                  </div>
                  <Switch
                    id="canViewOwnTickets"
                    checked={permissions.canViewOwnTickets}
                    onCheckedChange={(checked) => handlePermissionChange('canViewOwnTickets', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canViewAccountTickets" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canViewAccountTickets')}
                      <span>View All Account Tickets</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      View all tickets for this account, regardless of assignment
                    </div>
                  </div>
                  <Switch
                    id="canViewAccountTickets"
                    checked={permissions.canViewAccountTickets}
                    onCheckedChange={(checked) => handlePermissionChange('canViewAccountTickets', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canCreateTickets" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canCreateTickets')}
                      <span>Create Tickets</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Create new support tickets
                    </div>
                  </div>
                  <Switch
                    id="canCreateTickets"
                    checked={permissions.canCreateTickets}
                    onCheckedChange={(checked) => handlePermissionChange('canCreateTickets', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Account Management</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Control administrative access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageAccountUsers" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canManageAccountUsers')}
                      <span>Manage Account Users</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Invite, edit, and manage other account users
                    </div>
                  </div>
                  <Switch
                    id="canManageAccountUsers"
                    checked={permissions.canManageAccountUsers}
                    onCheckedChange={(checked) => handlePermissionChange('canManageAccountUsers', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Financial Information</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Control access to time tracking and billing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canViewTimeEntries" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canViewTimeEntries')}
                      <span>View Time Entries</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      View time tracking information for account tickets
                    </div>
                  </div>
                  <Switch
                    id="canViewTimeEntries"
                    checked={permissions.canViewTimeEntries}
                    onCheckedChange={(checked) => handlePermissionChange('canViewTimeEntries', checked)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canViewInvoices" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canViewInvoices')}
                      <span>View Invoices</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      View billing and invoice information
                    </div>
                  </div>
                  <Switch
                    id="canViewInvoices"
                    checked={permissions.canViewInvoices}
                    onCheckedChange={(checked) => handlePermissionChange('canViewInvoices', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Communication */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Communication</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Control notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="canReceiveNotifications" className="text-sm font-normal flex items-center space-x-2">
                      {getPermissionIcon('canReceiveNotifications')}
                      <span>Receive Notifications</span>
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Receive email notifications for ticket updates
                    </div>
                  </div>
                  <Switch
                    id="canReceiveNotifications"
                    checked={permissions.canReceiveNotifications}
                    onCheckedChange={(checked) => handlePermissionChange('canReceiveNotifications', checked)}
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Permissions updated successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-start space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Error updating permissions</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !canUpdateUsers}
          >
            {isSubmitting ? 'Updating...' : 'Update Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}