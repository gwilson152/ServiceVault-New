"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleAccountSelector } from "@/components/selectors/simple-account-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building, User, Users } from "lucide-react";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated: () => void;
}

interface ParentAccount {
  id: string;
  name: string;
  accountType: string;
  parentAccountId?: string | null;
  companyName?: string;
}

export function CreateAccountDialog({ open, onOpenChange, onAccountCreated }: CreateAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    accountType: 'INDIVIDUAL',
    companyName: '',
    address: '',
    phone: '',
    parentAccountId: '',
  });

  // Fetch potential parent accounts when dialog opens
  useEffect(() => {
    if (open) {
      fetchParentAccounts();
    }
  }, [open]);

  const fetchParentAccounts = async () => {
    try {
      // Fetch all accounts that can be parents (organizations and existing subsidiaries)
      const response = await fetch('/api/accounts/all');
      if (response.ok) {
        const data = await response.json();
        // Filter to only show accounts that can be parents
        const validParents = data.filter((account: ParentAccount) => 
          account.accountType === 'ORGANIZATION' || account.accountType === 'SUBSIDIARY'
        );
        setParentAccounts(validParents);
      }
    } catch (error) {
      console.error('Error fetching parent accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        parentAccountId: formData.accountType === 'SUBSIDIARY' ? formData.parentAccountId : null,
      };

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          name: '',
          accountType: 'INDIVIDUAL',
          companyName: '',
          address: '',
          phone: '',
          parentAccountId: '',
        });
        onAccountCreated();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear parent account when changing away from subsidiary
    if (field === 'accountType' && value !== 'SUBSIDIARY') {
      setFormData(prev => ({ ...prev, parentAccountId: '' }));
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4" />;
      case "SUBSIDIARY": return <Building className="h-4 w-4 text-blue-500" />;
      case "INDIVIDUAL": return <User className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Add a new client account to the system. Choose the account type that best fits your needs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selection */}
          <div className="space-y-3">
            <Label>Account Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'INDIVIDUAL', label: 'Individual', description: 'Single person account' },
                { value: 'ORGANIZATION', label: 'Organization', description: 'Company with multiple users' },
                { value: 'SUBSIDIARY', label: 'Subsidiary', description: 'Child of another organization' },
              ].map((type) => (
                <div
                  key={type.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.accountType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-border'
                  }`}
                  onClick={() => handleInputChange('accountType', type.value)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {getAccountTypeIcon(type.value)}
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Parent Account Selection (only for subsidiaries) */}
          {formData.accountType === 'SUBSIDIARY' && (
            <div className="space-y-2">
              <Label htmlFor="parentAccount">Parent Organization</Label>
              <SimpleAccountSelector
                accounts={parentAccounts}
                value={formData.parentAccountId}
                onValueChange={(value) => handleInputChange('parentAccountId', value)}
                placeholder="Select parent organization"
                showIcons={true}
                showHierarchy={true}
                filterByType={['ORGANIZATION', 'SUBSIDIARY']}
              />
              <div className="text-xs text-muted-foreground">
                Select the organization or parent subsidiary this account belongs to
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={formData.accountType === 'INDIVIDUAL' ? 'John Doe' : 'Company Name'}
                required
              />
            </div>
            
            {formData.accountType !== 'INDIVIDUAL' && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Official company name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Street address, city, state, postal code"
              rows={3}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}