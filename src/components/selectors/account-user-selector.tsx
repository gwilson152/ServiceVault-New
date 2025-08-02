"use client";

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AccountSelector, Account } from "@/components/selectors/account-selector";
import { Building, User, Mail } from "lucide-react";
import { AccountUserWithStatus, getAccountUserStatusDisplay } from "@/types/account-user";

// Use the shared type
type AccountUser = AccountUserWithStatus;

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AccountUserSelectorProps {
  accounts: Account[];
  employees: Employee[];
  selectedAccountId: string;
  selectedAssigneeId: string;
  onAccountChange: (accountId: string) => void;
  onAssigneeChange: (assigneeId: string) => void;
  accountLabel?: string;
  assigneeLabel?: string;
  showAccountUsers?: boolean;
  showEmployees?: boolean;
  className?: string;
}

export function AccountUserSelector({
  accounts,
  employees,
  selectedAccountId,
  selectedAssigneeId,
  onAccountChange,
  onAssigneeChange,
  accountLabel = "Account",
  assigneeLabel = "Assign To",
  showAccountUsers = true,
  showEmployees = true,
  className = ""
}: AccountUserSelectorProps) {
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch account users when account is selected
  useEffect(() => {
    if (selectedAccountId && showAccountUsers) {
      setIsLoadingUsers(true);
      // Only fetch active account users for assignment purposes
      fetch(`/api/account-users?accountId=${selectedAccountId}&activeOnly=true`)
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch account users');
        })
        .then((data: AccountUser[]) => {
          setAccountUsers(data);
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
  }, [selectedAccountId, showAccountUsers]);

  // Reset assignee when account changes
  useEffect(() => {
    if (selectedAccountId) {
      onAssigneeChange("unassigned");
    }
  }, [selectedAccountId, onAssigneeChange]);

  const renderAssigneeOptions = () => {
    const options = [
      <SelectItem key="unassigned" value="unassigned">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>Unassigned</span>
        </div>
      </SelectItem>
    ];

    // Add employees
    if (showEmployees) {
      employees.forEach(employee => {
        options.push(
          <SelectItem key={`employee-${employee.id}`} value={employee.id}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium">{employee.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {employee.email} • {employee.role}
                </span>
              </div>
            </div>
          </SelectItem>
        );
      });
    }

    // Add account users if an account is selected
    if (showAccountUsers && selectedAccountId && accountUsers.length > 0) {
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
                  {accountUser.email} • Account User ({status.loginStatus})
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
    <div className={`space-y-4 ${className}`}>
      {/* Account Selection */}
      <div className="space-y-2">
        <Label htmlFor="account-select">{accountLabel}</Label>
        <AccountSelector
          accounts={accounts}
          value={selectedAccountId}
          onValueChange={onAccountChange}
          placeholder="Select an account"
          enableFilters={true}
          enableGrouping={true}
        />
      </div>

      {/* Assignee Selection */}
      <div className="space-y-2">
        <Label htmlFor="assignee-select">
          {assigneeLabel}
          {isLoadingUsers && (
            <span className="text-xs text-muted-foreground ml-2">(Loading users...)</span>
          )}
        </Label>
        <Select value={selectedAssigneeId} onValueChange={onAssigneeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {renderAssigneeOptions()}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export type { AccountUser, Employee };