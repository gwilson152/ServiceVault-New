"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MultiUserSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeAccountUsers?: boolean;
}

export function MultiUserSelector({
  selectedUserIds,
  onSelectionChange,
  disabled = false,
  placeholder = "Select users",
  excludeAccountUsers = false
}: MultiUserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, excludeAccountUsers]);

  // Update selected users when selectedUserIds changes
  useEffect(() => {
    const selected = users.filter(user => selectedUserIds.includes(user.id));
    setSelectedUsers(selected);
  }, [selectedUserIds, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const allUsers = await response.json();
        // Filter users based on excludeAccountUsers flag
        const filteredUsers = excludeAccountUsers 
          ? allUsers.filter((user: User) => user.role === 'ADMIN' || user.role === 'EMPLOYEE')
          : allUsers;
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserToggle = (user: User, checked: boolean) => {
    if (checked) {
      const newSelection = [...selectedUserIds, user.id];
      onSelectionChange(newSelection);
    } else {
      const newSelection = selectedUserIds.filter(id => id !== user.id);
      onSelectionChange(newSelection);
    }
  };

  const handleRemoveUser = (userId: string) => {
    const newSelection = selectedUserIds.filter(id => id !== userId);
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredUsers.map(user => user.id);
    const newSelection = [...new Set([...selectedUserIds, ...allFilteredIds])];
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full justify-start"
      >
        <Users className="mr-2 h-4 w-4" />
        {selectedUserIds.length === 0 
          ? placeholder 
          : `${selectedUserIds.length} user${selectedUserIds.length !== 1 ? 's' : ''} selected`
        }
      </Button>

      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map(user => (
            <Badge key={user.id} variant="secondary" className="text-xs">
              {user.name || user.email}
              <button
                onClick={() => handleRemoveUser(user.id)}
                className="ml-1 hover:text-red-600"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Users</DialogTitle>
            <DialogDescription>
              Choose users to assign the role to. You can select multiple users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedUserIds.length} of {users.length} users selected
              </div>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading}
                >
                  Select All Visible
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isLoading || selectedUserIds.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* User List */}
            <ScrollArea className="h-[300px] border rounded-md p-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex items-center justify-center h-20">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleUserToggle(user, checked === true)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`user-${user.id}`} className="text-sm font-medium cursor-pointer">
                              {user.name || user.email}
                            </Label>
                            <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'default'} className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                          {user.name && (
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Done ({selectedUserIds.length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}