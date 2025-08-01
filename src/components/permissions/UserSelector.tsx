"use client";

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Search } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  roleFilter?: string;
  excludeAccountUsers?: boolean;
  className?: string;
}

export function UserSelector({
  value,
  onValueChange,
  placeholder = "Select a user",
  roleFilter,
  excludeAccountUsers = true,
  className = ""
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = "/api/users";
      const params = new URLSearchParams();
      
      if (roleFilter) {
        params.append("role", roleFilter);
      }
      
      if (excludeAccountUsers) {
        params.append("excludeAccountUsers", "true");
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, excludeAccountUsers]);

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive' as const;
      case 'EMPLOYEE':
        return 'default' as const;
      case 'ACCOUNT_USER':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const handleValueChange = (newValue: string) => {
    // Don't allow selection of placeholder values
    if (newValue === "__loading__" || newValue === "__no_users__") {
      return;
    }
    onValueChange(newValue);
  };

  return (
    <div className={className}>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {isLoading ? (
            <SelectItem value="__loading__" disabled>
              Loading users...
            </SelectItem>
          ) : filteredUsers.length === 0 ? (
            <SelectItem value="__no_users__" disabled>
              No users found
            </SelectItem>
          ) : (
            filteredUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || user.email}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="ml-2">
                    {user.role}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}