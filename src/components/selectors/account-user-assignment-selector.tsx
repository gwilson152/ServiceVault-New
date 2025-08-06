"use client";

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building, User, Mail } from "lucide-react";
import { AccountUserWithStatus, getAccountUserStatusDisplay } from "@/types/account-user";

interface AccountUserAssignmentSelectorProps {
  selectedAccountId: string;
  selectedAccountUserId: string;
  onAccountUserChange: (accountUserId: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AccountUserAssignmentSelector({
  selectedAccountId,
  selectedAccountUserId,
  onAccountUserChange,
  label = "For Account User",
  placeholder = "Select account user",
  className = "",
  disabled = false
}: AccountUserAssignmentSelectorProps) {
  const [accountUsers, setAccountUsers] = useState<AccountUserWithStatus[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch account users when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      setIsLoadingUsers(true);
      // Fetch account users who can have tickets created for them (tickets:assignable-for permission)
      fetch(`/api/account-users/assignable-for?accountId=${selectedAccountId}`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch account users');
        })
        .then((data: { accountUsers: any[] }) => {
          // Map the new API response to AccountUserWithStatus format
          const mappedUsers = data.accountUsers?.map(user => ({
            id: user.membershipId, // Use membershipId as the ID for selection
            membershipId: user.membershipId, // Keep original membershipId
            name: user.name,
            email: user.email,
            phone: undefined,
            isActive: true, // Users from assignable-for endpoint are active by definition
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            account: { id: selectedAccountId, name: '', accountType: '' }, // Minimal account info
            user: { id: user.userId, name: user.name, email: user.email, role: user.role },
            hasLogin: true, // Users from this endpoint have login by definition
            canBeAssigned: true, // They can be assigned tickets for by definition
            invitationStatus: 'activated' as const
          })) || [];
          setAccountUsers(mappedUsers);
        })
        .catch(error => {
          console.error('Error fetching account users:', error);
          setAccountUsers([]);
        })
        .finally(() => {
          setIsLoadingUsers(false);
        });
    } else {
      setAccountUsers([]);
    }
  }, [selectedAccountId]);

  // Reset selection when account changes
  useEffect(() => {
    if (selectedAccountId) {
      onAccountUserChange("unassigned");
    }
  }, [selectedAccountId, onAccountUserChange]);

  const renderAccountUserOptions = () => {
    const options = [
      <SelectItem key="unassigned" value="unassigned">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>General Account Issue</span>
        </div>
      </SelectItem>
    ];

    if (selectedAccountId && accountUsers.length > 0) {
      accountUsers.forEach(accountUser => {
        const status = getAccountUserStatusDisplay(accountUser);
        
        options.push(
          <SelectItem key={`account-user-${accountUser.id}`} value={accountUser.id}>
            <div className="flex items-center gap-2">
              <Building className={`h-4 w-4 ${status.iconColor}`} />
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{accountUser.name}</span>
                  <span className="text-xs">{status.icon}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {accountUser.email} • {status.loginStatus}
                </span>
              </div>
            </div>
          </SelectItem>
        );
      });
    }

    return options;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="account-user-select">
        {label}
        {isLoadingUsers && (
          <span className="text-xs text-muted-foreground ml-2">(Loading users...)</span>
        )}
      </Label>
      <div className="text-xs text-muted-foreground mb-2">
        Specify if this ticket is for a particular customer/user within the account
      </div>
      <Select 
        value={selectedAccountUserId} 
        onValueChange={onAccountUserChange}
        disabled={disabled || !selectedAccountId}
      >
        <SelectTrigger id="account-user-select">
          <SelectValue placeholder={selectedAccountId ? placeholder : "Select account first"} />
        </SelectTrigger>
        <SelectContent>
          {renderAccountUserOptions()}
        </SelectContent>
      </Select>
      
      {!selectedAccountId && (
        <div className="text-xs text-amber-600">
          Please select an account first to see available users
        </div>
      )}
    </div>
  );
}