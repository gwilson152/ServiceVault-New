"use client";

import React from 'react';
import { AccountSelector, Account } from "@/components/selectors/account-selector";

// Legacy interface for backward compatibility
interface LegacyAccount {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  parentAccountId?: string | null;
  parentAccount?: {
    id: string;
    name: string;
    accountType: string;
  } | null;
  childAccounts?: {
    id: string;
    name: string;
    accountType: string;
  }[];
}

interface HierarchicalAccountSelectorProps {
  accounts: LegacyAccount[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

/**
 * @deprecated Use AccountSelector from @/components/selectors/account-selector instead
 * This component is maintained for backward compatibility
 */
export function HierarchicalAccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account"
}: HierarchicalAccountSelectorProps) {
  // Convert legacy accounts to new Account interface
  const convertedAccounts: Account[] = accounts.map(account => ({
    ...account,
    parentId: account.parentAccountId || account.parentAccount?.id || null
  }));

  return (
    <AccountSelector
      accounts={convertedAccounts}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      enableFilters={true}
      enableGrouping={true}
    />
  );
}

// Re-export types for backward compatibility
export type { LegacyAccount as Account };