/**
 * Assign Parent Dialog Component
 * 
 * Provides interface for assigning or reassigning parent accounts with:
 * - Account hierarchy selection with AccountSelector
 * - Business rule validation (prevent circular references)
 * - Clear current parent option
 * - Real-time validation feedback
 * 
 * Features:
 * - Uses AccountSelector for hierarchical parent selection
 * - Prevents self-assignment and circular references
 * - Shows current parent relationship
 * - Supports removing parent (making account top-level)
 * - Permission-based access control
 * 
 * Integration:
 * - Uses /api/accounts/[id]/parent PATCH endpoint
 * - Integrates with AccountSelector for parent selection
 * - Follows established dialog patterns from other components
 * - Updates parent data and triggers re-fetch of account list
 */

"use client";

import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountSelector } from "@/components/selectors/account-selector";
import {
  Building,
  Building2, 
  User,
  ArrowRight,
  X,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { AccountWithHierarchy } from "@/utils/hierarchy";

interface AssignParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountWithHierarchy | null;
  accounts: AccountWithHierarchy[];
  onParentAssigned?: () => void;
}

export function AssignParentDialog({ 
  open, 
  onOpenChange, 
  account, 
  accounts,
  onParentAssigned 
}: AssignParentDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedAccountType, setSelectedAccountType] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes or account changes
  useEffect(() => {
    if (open && account) {
      setSelectedParentId(account.parentId || "");
      setSelectedAccountType(account.accountType || "");
      setAccountName(account.name || "");
    } else {
      setSelectedParentId("");
      setSelectedAccountType("");
      setAccountName("");
    }
  }, [open, account]);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Building className="h-4 w-4" />;
      case "SUBSIDIARY": return <Building2 className="h-4 w-4 text-blue-500" />;
      case "INDIVIDUAL": return <User className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "ORGANIZATION": return <Badge variant="default">Organization</Badge>;
      case "SUBSIDIARY": return <Badge variant="secondary">Subsidiary</Badge>;
      case "INDIVIDUAL": return <Badge variant="outline">Individual</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  // Filter out the current account and its descendants to prevent circular references
  const getEligibleParents = () => {
    if (!account) return accounts;

    const ineligibleIds = new Set([account.id]);
    
    // Add all descendants of the current account to ineligible list
    const addDescendants = (acc: AccountWithHierarchy) => {
      if (acc.children) {
        acc.children.forEach(child => {
          ineligibleIds.add(child.id);
          addDescendants(child);
        });
      }
    };
    
    addDescendants(account);

    return accounts.filter(acc => !ineligibleIds.has(acc.id));
  };

  const selectedParent = accounts.find(acc => acc.id === selectedParentId);
  const currentParent = account?.parent;
  const hasParentChanges = selectedParentId !== (account?.parentId || "");
  const hasTypeChanges = selectedAccountType !== (account?.accountType || "");
  const hasNameChanges = accountName !== (account?.name || "");
  const hasChanges = hasParentChanges || hasTypeChanges || hasNameChanges;

  const handleAssignParent = async () => {
    if (!account) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/accounts/${account.id}/parent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId: selectedParentId || null,
          accountType: selectedAccountType || null,
          name: accountName || null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign parent');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message
      });

      onOpenChange(false);
      onParentAssigned?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign parent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBusinessRuleWarning = () => {
    const finalAccountType = selectedAccountType || account?.accountType;
    
    // Check name validation
    if (accountName.trim() === '') {
      return "Account name cannot be empty";
    }
    if (accountName.length > 100) {
      return "Account name cannot exceed 100 characters";
    }
    
    // Check parent-child type compatibility
    if (selectedParent && finalAccountType === 'SUBSIDIARY' && selectedParent.accountType === 'INDIVIDUAL') {
      return "Subsidiary accounts cannot have Individual accounts as parents";
    }

    // Check if subsidiary needs a parent
    if (finalAccountType === 'SUBSIDIARY' && !selectedParentId && !account?.parentId) {
      return "Subsidiary accounts must have a parent account";
    }

    // Check child compatibility when changing to Individual
    if (finalAccountType === 'INDIVIDUAL' && account?.children && account.children.length > 0) {
      const orgOrSubChildren = account.children.filter(child => 
        child.accountType === 'ORGANIZATION' || child.accountType === 'SUBSIDIARY'
      );
      if (orgOrSubChildren.length > 0) {
        return "Individual accounts cannot have Organization or Subsidiary child accounts";
      }
    }

    return null;
  };

  const businessRuleWarning = getBusinessRuleWarning();

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Edit Account Settings
          </DialogTitle>
          <DialogDescription>
            Change the parent account and account type for this account in the hierarchy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Account Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Account</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {getAccountTypeIcon(account.accountType)}
              <span className="font-medium">{account.name}</span>
              {getAccountTypeBadge(account.accountType)}
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account name"
              className="w-full"
              maxLength={100}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Change the display name for this account.</span>
              <span className={accountName.length > 90 ? 'text-orange-500' : ''}>{accountName.length}/100</span>
            </div>  
          </div>

          {/* Current Parent (if any) */}
          {currentParent && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Parent</Label>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                {getAccountTypeIcon(currentParent.accountType)}
                <span className="font-medium">{currentParent.name}</span>
                {getAccountTypeBadge(currentParent.accountType)}
              </div>
            </div>
          )}

          {/* Parent Selection */}
          <div className="space-y-2">
            <Label>New Parent Account</Label>
            <AccountSelector
              accounts={getEligibleParents()}
              value={selectedParentId}
              onValueChange={setSelectedParentId}
              placeholder="Select parent account (optional)"
              enableFilters={true}
              enableGrouping={true}
              allowClear={true}
            />
            <p className="text-xs text-gray-500">
              Leave empty to make this a top-level account with no parent.
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Individual
                  </div>
                </SelectItem>
                <SelectItem value="ORGANIZATION">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Organization
                  </div>
                </SelectItem>
                <SelectItem value="SUBSIDIARY">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Subsidiary
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose the account type based on your business structure.
            </p>
          </div>

          {/* Business Rule Warning */}
          {businessRuleWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{businessRuleWarning}</AlertDescription>
            </Alert>
          )}

          {/* Change Preview */}
          {hasChanges && !businessRuleWarning && (
            <Alert>
              <ArrowRight className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {currentParent?.name || "No parent"} 
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-sm font-medium">
                    {selectedParent?.name || "No parent"}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Hierarchy Rules Info */}
          <Alert>
            <Building className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <div className="font-medium">Hierarchy Rules:</div>
                <ul className="text-xs space-y-1 ml-2">
                  <li>• Organizations can be top-level or have any parent type</li>
                  <li>• Subsidiaries cannot have Individual parents</li>
                  <li>• Individuals can have any parent type</li>
                  <li>• Circular references are not allowed</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignParent}
            disabled={loading || !!businessRuleWarning || !hasChanges}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedParentId ? 'Assign Parent' : 'Remove Parent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}