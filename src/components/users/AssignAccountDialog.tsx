/**
 * Assign Account Dialog Component
 * 
 * Allows assigning a user to accounts with role selection.
 * Used in user detail pages to manage account memberships.
 * 
 * Features:
 * - Account selection with hierarchical display
 * - Role assignment for the membership
 * - Validation to prevent duplicate memberships
 * - Search and filter functionality
 * 
 * Integration:
 * - Uses AccountMembership API endpoints
 * - Integrates with AccountSelector component
 * - Permission-based functionality
 */

"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AccountSelector } from "@/components/selectors/account-selector";
import { Building, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface Account {
  id: string;
  name: string;
  accountType: string;
  parent?: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  inheritAllPermissions: boolean;
}

interface AssignAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  existingAccountIds: string[];
  onAccountAssigned: () => void;
}

export function AssignAccountDialog({
  open,
  onOpenChange,
  userId,
  userName,
  existingAccountIds,
  onAccountAssigned
}: AssignAccountDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  const { toast } = useToast();

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadAccounts();
      loadRoles();
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounts/all');
      if (response.ok) {
        const data = await response.json();
        // Filter out accounts user is already a member of
        const availableAccounts = data.filter((account: Account) => 
          !existingAccountIds.includes(account.id)
        );
        setAccounts(availableAccounts);
      } else {
        throw new Error('Failed to load accounts');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        // Filter to account-scoped roles only
        const accountRoles = data.filter((role: Role) => !role.inheritAllPermissions);
        setRoles(accountRoles);
      } else {
        throw new Error('Failed to load roles');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive"
      });
    }
  };

  const handleAssignAccount = async () => {
    if (!selectedAccount) {
      toast({
        title: "Error",
        description: "Please select an account to assign the user to",
        variant: "destructive"
      });
      return;
    }

    try {
      setAssigning(true);
      const response = await fetch('/api/account-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          userId: userId,
          roleIds: selectedRoles
        }),
      });

      if (response.ok) {
        const selectedAccountDetails = accounts.find(a => a.id === selectedAccount);
        toast({
          title: "Success",
          description: `${userName} has been assigned to ${selectedAccountDetails?.name}`
        });
        
        // Reset form
        setSelectedAccount("");
        setSelectedRoles([]);
        
        // Close dialog and refresh parent
        onOpenChange(false);
        onAccountAssigned();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign user to account');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign user to account",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const selectedAccountDetails = accounts.find(a => a.id === selectedAccount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {userName} to Account</DialogTitle>
          <DialogDescription>
            Select an account and assign roles for this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Selection */}
          <div>
            <Label>Select Account</Label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>No available accounts found</span>
              </div>
            ) : (
              <AccountSelector
                accounts={accounts}
                value={selectedAccount}
                onValueChange={setSelectedAccount}
                placeholder="Select account to assign user to"
                enableFilters={true}
                enableGrouping={true}
              />
            )}
          </div>

          {/* Selected Account Details */}
          {selectedAccountDetails && (
            <div className="p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Building className="h-8 w-8 p-2 bg-accent rounded-full" />
                <div>
                  <p className="font-medium">{selectedAccountDetails.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAccountDetails.accountType}
                    {selectedAccountDetails.parent && (
                      <span> • Child of {selectedAccountDetails.parent.name}</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Role Selection */}
              <div>
                <Label>Account Roles (Optional)</Label>
                <Select value={selectedRoles.join(',')} onValueChange={(value) => setSelectedRoles(value ? value.split(',') : [])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select roles for this account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            - {role.description}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to assign user without specific account roles
                </p>
                
                {/* Show selected roles */}
                {selectedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRoles.map((roleId) => {
                      const role = roles.find(r => r.id === roleId);
                      return role ? (
                        <Badge key={roleId} variant="outline">
                          {role.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignAccount} 
            disabled={!selectedAccount || assigning}
          >
            {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign to Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}