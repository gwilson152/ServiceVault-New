"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Building2, User } from "lucide-react";
import { Account } from "./account-selector";

export interface SimpleAccountSelectorProps {
  accounts: Account[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  showIcons?: boolean;
  showHierarchy?: boolean;
  className?: string;
  filterByType?: string[]; // Filter to show only specific account types
}

export function SimpleAccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account",
  showIcons = true,
  showHierarchy = false,
  className = "",
  filterByType
}: SimpleAccountSelectorProps) {
  
  // Filter accounts by type if specified
  const filteredAccounts = filterByType 
    ? accounts.filter(account => filterByType.includes(account.accountType))
    : accounts;

  // Sort accounts: organizations first, then subsidiaries, then individuals
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    const typeOrder = { 'ORGANIZATION': 0, 'SUBSIDIARY': 1, 'INDIVIDUAL': 2 };
    const aOrder = typeOrder[a.accountType as keyof typeof typeOrder] ?? 3;
    const bOrder = typeOrder[b.accountType as keyof typeof typeOrder] ?? 3;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return a.name.localeCompare(b.name);
  });

  const getAccountIcon = (accountType: string) => {
    if (!showIcons) return null;
    
    switch (accountType) {
      case 'ORGANIZATION':
        return <Building className="h-4 w-4" />;
      case 'SUBSIDIARY':
        return <Building2 className="h-4 w-4" />;
      case 'INDIVIDUAL':
        return <User className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getDisplayName = (account: Account) => {
    if (!showHierarchy) {
      return account.name;
    }
    
    // Build hierarchy path for display
    const buildPath = (acc: Account): string => {
      const parent = accounts.find(a => a.id === (acc.parentAccountId || acc.parentAccount?.id));
      if (parent) {
        return `${buildPath(parent)} > ${acc.name}`;
      }
      return acc.name;
    };
    
    return buildPath(account);
  };

  const selectedAccount = accounts.find(acc => acc.id === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-full ${className}`}>
        <SelectValue placeholder={placeholder}>
          {selectedAccount && (
            <div className="flex items-center gap-2">
              {getAccountIcon(selectedAccount.accountType)}
              <span>{selectedAccount.name}</span>
              {showHierarchy && selectedAccount.parentAccount && (
                <span className="text-muted-foreground text-xs">
                  ({selectedAccount.parentAccount.name})
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedAccounts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No accounts available
          </div>
        ) : (
          sortedAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                {getAccountIcon(account.accountType)}
                <span className="flex-1">{getDisplayName(account)}</span>
                {account.companyName && account.companyName !== account.name && (
                  <span className="text-xs text-muted-foreground">
                    {account.companyName}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}