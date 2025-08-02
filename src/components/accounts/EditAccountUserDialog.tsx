"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { 
  AlertCircle, 
  CheckCircle, 
  User, 
  Phone, 
  Mail, 
  Settings,
  Building,
  Clock4,
  AlertTriangle
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { AccountUserWithStatus } from "@/types/account-user";

interface EditAccountUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountUser: AccountUserWithStatus | null;
  onUserUpdated: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  permissions: {
    canViewOwnTickets: boolean;
    canViewAccountTickets: boolean;
    canCreateTickets: boolean;
    canManageAccountUsers: boolean;
  };
}

export function EditAccountUserDialog({
  isOpen,
  onOpenChange,
  accountUser,
  onUserUpdated
}: EditAccountUserDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    isActive: true,
    permissions: {
      canViewOwnTickets: true,
      canViewAccountTickets: false,
      canCreateTickets: true,
      canManageAccountUsers: false,
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  
  const { canUpdateUsers } = usePermissions();

  // Load account user data when dialog opens
  useEffect(() => {
    if (accountUser) {
      setFormData({
        name: accountUser.name || "",
        email: accountUser.email || "",
        phone: accountUser.phone || "",
        isActive: accountUser.isActive || false,
        permissions: {
          canViewOwnTickets: accountUser.permissions?.canViewOwnTickets ?? true,
          canViewAccountTickets: accountUser.permissions?.canViewAccountTickets ?? false,
          canCreateTickets: accountUser.permissions?.canCreateTickets ?? true,
          canManageAccountUsers: accountUser.permissions?.canManageAccountUsers ?? false,
        }
      });
      setSubmitStatus('idle');
      setErrorMessage("");
    }
  }, [accountUser]);

  const resetForm = () => {
    if (accountUser) {
      setFormData({
        name: accountUser.name || "",
        email: accountUser.email || "",
        phone: accountUser.phone || "",
        isActive: accountUser.isActive || false,
        permissions: {
          canViewOwnTickets: accountUser.permissions?.canViewOwnTickets ?? true,
          canViewAccountTickets: accountUser.permissions?.canViewAccountTickets ?? false,
          canCreateTickets: accountUser.permissions?.canCreateTickets ?? true,
          canManageAccountUsers: accountUser.permissions?.canManageAccountUsers ?? false,
        }
      });
    }
    setSubmitStatus('idle');
    setErrorMessage("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Name is required";
    }
    
    if (!formData.email.trim()) {
      return "Email address is required";
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }
    
    return null;
  };

  const handleSubmit = async () => {
    if (!accountUser) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setSubmitStatus('error');
      return;
    }

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
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          isActive: formData.isActive,
          permissions: formData.permissions
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          onUserUpdated();
          handleClose();
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Failed to update user');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage('Failed to update user. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionChange = (key: keyof typeof formData.permissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value
      }
    }));
  };

  const getStatusBadges = () => {
    if (!accountUser) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
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

        {/* Account */}
        <Badge variant="outline">
          <Building className="h-3 w-3 mr-1" />
          {accountUser.account?.name}
        </Badge>
      </div>
    );
  };

  if (!accountUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Edit Account User</span>
          </DialogTitle>
          <DialogDescription>
            Update user information and permissions for <strong>{accountUser.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Overview */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Current Status</Label>
            {getStatusBadges()}
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Basic Information</Label>
              <p className="text-sm text-muted-foreground">
                Update the user's basic profile information
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Used for login and notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Separator />

          {/* Assignment Status */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Assignment Status</Label>
              <p className="text-sm text-muted-foreground">
                Control whether this user can be assigned to tickets
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-sm font-normal">
                  Enable for Assignment
                </Label>
                <div className="text-xs text-muted-foreground">
                  User can be assigned tickets and receive notifications
                </div>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Account Permissions</Label>
              <p className="text-sm text-muted-foreground">
                Configure what this user can access within the account
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="canViewOwnTickets" className="text-sm font-normal">
                    View Own Tickets
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    User can view tickets they created or are assigned to
                  </div>
                </div>
                <Switch
                  id="canViewOwnTickets"
                  checked={formData.permissions.canViewOwnTickets}
                  onCheckedChange={(checked) => handlePermissionChange('canViewOwnTickets', checked)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="canViewAccountTickets" className="text-sm font-normal">
                    View All Account Tickets
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    User can view all tickets for this account
                  </div>
                </div>
                <Switch
                  id="canViewAccountTickets"
                  checked={formData.permissions.canViewAccountTickets}
                  onCheckedChange={(checked) => handlePermissionChange('canViewAccountTickets', checked)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="canCreateTickets" className="text-sm font-normal">
                    Create Tickets
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    User can create new support tickets
                  </div>
                </div>
                <Switch
                  id="canCreateTickets"
                  checked={formData.permissions.canCreateTickets}
                  onCheckedChange={(checked) => handlePermissionChange('canCreateTickets', checked)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="canManageAccountUsers" className="text-sm font-normal">
                    Manage Account Users
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    User can invite and manage other account users
                  </div>
                </div>
                <Switch
                  id="canManageAccountUsers"
                  checked={formData.permissions.canManageAccountUsers}
                  onCheckedChange={(checked) => handlePermissionChange('canManageAccountUsers', checked)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">User updated successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-start space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Error updating user</p>
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
            {isSubmitting ? 'Updating...' : 'Update User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}