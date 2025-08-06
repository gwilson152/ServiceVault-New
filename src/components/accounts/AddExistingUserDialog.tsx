/**
 * Add Existing User Dialog Component
 * 
 * Allows adding existing users to an account with role assignment.
 * Provides search functionality and role selection for account membership.
 * 
 * Features:
 * - Search existing users by name/email
 * - Filter users who aren't already members of the account
 * - Role selection for new membership
 * - Validation and error handling
 * 
 * Integration:
 * - Used in account detail pages
 * - Uses AccountMembership API endpoints
 * - Integrates with permission system
 */

"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface User {
  id: string;
  name: string;
  email: string;
  systemRoles: Array<{
    role: {
      name: string;
    };
  }>;
  memberships: Array<{
    accountId: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  inheritAllPermissions: boolean;
}

interface AddExistingUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  onUserAdded: () => void;
}

export function AddExistingUserDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  onUserAdded
}: AddExistingUserDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const { toast } = useToast();

  // Load available users when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
      loadRoles();
    }
  }, [open, accountId]);

  const loadUsers = async () => {
    try {
      setSearching(true);
      const response = await fetch('/api/users?includeAccountInfo=true');
      if (response.ok) {
        const data = await response.json();
        // Filter out users who are already members of this account
        const availableUsers = data.filter((user: User) => 
          !user.memberships.some(m => m.accountId === accountId)
        );
        setUsers(availableUsers);
      } else {
        throw new Error('Failed to load users');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
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

  const handleAddUser = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user to add",
        variant: "destructive"
      });
      return;
    }

    try {
      setAdding(true);
      const response = await fetch('/api/account-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          userId: selectedUser,
          roleIds: selectedRoles
        }),
      });

      if (response.ok) {
        const user = users.find(u => u.id === selectedUser);
        toast({
          title: "Success",
          description: `${user?.name} has been added to ${accountName}`
        });
        
        // Reset form
        setSelectedUser("");
        setSelectedRoles([]);
        setSearchTerm("");
        
        // Close dialog and refresh parent
        onOpenChange(false);
        onUserAdded();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user to account');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user to account",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserDetails = users.find(u => u.id === selectedUser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Existing User to {accountName}</DialogTitle>
          <DialogDescription>
            Select an existing user and assign roles for this account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Search */}
          <div>
            <Label htmlFor="user-search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* User Selection */}
          <div>
            <Label>Select User</Label>
            {searching ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <AlertCircle className="h-5 w-5 mr-2" />
                {users.length === 0 ? "No available users found" : "No users match your search"}
              </div>
            ) : (
              <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-3 rounded cursor-pointer border transition-colors ${
                      selectedUser === user.id 
                        ? 'bg-accent border-accent-foreground/20' 
                        : 'hover:bg-accent/50 border-transparent'
                    }`}
                    onClick={() => setSelectedUser(user.id)}
                  >
                    <div className="relative">
                      <User className="h-8 w-8 p-2 bg-muted rounded-full" />
                      {selectedUser === user.id && (
                        <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-green-600 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.systemRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.systemRoles.map((sr, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {sr.role.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected User Details */}
          {selectedUserDetails && (
            <div className="p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <User className="h-8 w-8 p-2 bg-accent rounded-full" />
                <div>
                  <p className="font-medium">{selectedUserDetails.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUserDetails.email}</p>
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
                  Leave empty to add user without specific account roles
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser} 
            disabled={!selectedUser || adding}
          >
            {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add User to Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}