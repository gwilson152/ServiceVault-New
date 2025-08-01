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
import { AlertCircle, CheckCircle, Mail, User, Phone, FileText, UserPlus, Settings } from "lucide-react";
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
  creationMode: 'invitation' | 'manual';
  sendInvitation: boolean;
  temporaryPassword: string;
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
    creationMode: "invitation",
    sendInvitation: true,
    temporaryPassword: "",
    permissions: defaultPermissions
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  
  const { canCreateUsers, canInviteUsers, canCreateUsersManually } = usePermissions();

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      creationMode: "invitation",
      sendInvitation: true,
      temporaryPassword: "",
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

    // Validate manual creation fields
    if (formData.creationMode === 'manual' && !formData.temporaryPassword.trim()) {
      return "Temporary password is required for manual creation";
    }

    if (formData.creationMode === 'manual' && formData.temporaryPassword.length < 6) {
      return "Temporary password must be at least 6 characters";
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
      const apiEndpoint = formData.creationMode === 'manual' 
        ? '/api/account-users/create-manual'
        : '/api/account-users/invite';

      const requestBody = {
        accountId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        permissions: formData.permissions,
        ...(formData.creationMode === 'manual' ? {
          temporaryPassword: formData.temporaryPassword,
          sendWelcomeEmail: formData.sendInvitation
        } : {
          sendInvitation: formData.sendInvitation
        })
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
            Add a new user to <strong>{accountName}</strong>. 
            {formData.creationMode === 'manual' 
              ? ' The account will be created immediately with login credentials.'
              : ' They will receive an invitation to access the account.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Creation Mode Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">User Creation Method</Label>
              <p className="text-sm text-muted-foreground">
                Choose how to create this user account
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.creationMode === 'invitation' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, creationMode: 'invitation' }))}
              >
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Email Invitation</div>
                    <div className="text-xs text-muted-foreground">User sets up their own account</div>
                  </div>
                </div>
              </div>
              
              {canCreateUsersManually && (
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.creationMode === 'manual' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, creationMode: 'manual' }))}
                >
                  <div className="flex items-center space-x-3">
                    <UserPlus className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Manual Creation</div>
                      <div className="text-xs text-muted-foreground">Create account immediately</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

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

            {/* Manual Creation Password Field */}
            {formData.creationMode === 'manual' && (
              <div className="space-y-2">
                <Label htmlFor="temporaryPassword">Temporary Password *</Label>
                <Input
                  id="temporaryPassword"
                  type="password"
                  value={formData.temporaryPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                  placeholder="Enter temporary password"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  User will be required to change this password on first login
                </p>
              </div>
            )}
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

          {/* Email Options */}
          {canInviteUsers && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sendInvitation" className="text-sm font-normal">
                    {formData.creationMode === 'manual' ? 'Send Welcome Email' : 'Send Invitation Email'}
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {formData.creationMode === 'manual' 
                      ? 'Send welcome email with login credentials'
                      : 'Automatically send an invitation email to the user'
                    }
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
                      <p className="text-blue-800 font-medium">
                        {formData.creationMode === 'manual' ? 'Welcome Email' : 'Invitation Email'}
                      </p>
                      <p className="text-blue-700 mt-1">
                        {formData.creationMode === 'manual' 
                          ? 'The user will receive an email with their login credentials and welcome information.'
                          : 'The user will receive an email with instructions to set up their account and access the system.'
                        }
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
            disabled={isSubmitting || !canCreateUsers || (formData.creationMode === 'manual' && !canCreateUsersManually)}
          >
            {isSubmitting 
              ? 'Creating...' 
              : formData.creationMode === 'manual' 
                ? 'Create Account' 
                : 'Send Invitation'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}