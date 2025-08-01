"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Mail, User, Phone, FileText } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface CreateAccountUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  onUserCreated: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  sendInvitation: boolean;
  permissions: {
    canViewOwnTickets: boolean;
    canViewAccountTickets: boolean;
    canCreateTickets: boolean;
    canManageAccountUsers: boolean;
  };
}

const defaultPermissions = {
  canViewOwnTickets: true,
  canViewAccountTickets: false,
  canCreateTickets: true,
  canManageAccountUsers: false,
};

export function CreateAccountUserDialog({
  isOpen,
  onOpenChange,
  accountId,
  accountName,
  onUserCreated
}: CreateAccountUserDialogProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    phone: "",
    sendInvitation: true,
    permissions: defaultPermissions
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  
  const { canCreateUsers, canInviteUsers } = usePermissions();

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      sendInvitation: true,
      permissions: defaultPermissions
    });
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
      const response = await fetch('/api/account-users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          permissions: formData.permissions,
          sendInvitation: formData.sendInvitation
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          onUserCreated();
          handleClose();
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Failed to create user');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage('Failed to create user. Please try again.');
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Create Account User</span>
          </DialogTitle>
          <DialogDescription>
            Add a new user to <strong>{accountName}</strong>. They will receive an invitation to access the account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
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
                This will be used for login and notifications
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

          {/* Invitation Options */}
          {canInviteUsers && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sendInvitation" className="text-sm font-normal">
                    Send Invitation Email
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Automatically send an invitation email to the user
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {formData.sendInvitation && (
                    <Mail className="h-4 w-4 text-blue-500" />
                  )}
                  <Switch
                    id="sendInvitation"
                    checked={formData.sendInvitation}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendInvitation: checked }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {formData.sendInvitation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">Invitation Email</p>
                      <p className="text-blue-700 mt-1">
                        The user will receive an email with instructions to set up their account and access the system.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">User created successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-start space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Error creating user</p>
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
            disabled={isSubmitting || !canCreateUsers}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}