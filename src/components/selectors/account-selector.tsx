"use client";

import React from 'react';
import { 
  HierarchicalSelector, 
  HierarchicalItem, 
  ItemDisplayConfig, 
  FilterConfig 
} from "@/components/ui/hierarchical-selector";
import { Building, Building2, User } from "lucide-react";

// Account interface extending HierarchicalItem
export interface Account extends HierarchicalItem {
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

export interface AccountSelectorProps {
  accounts: Account[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  enableFilters?: boolean;
  enableGrouping?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function AccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account",
  enableFilters = true,
  enableGrouping = true,
  allowClear = false,
  className = ""
}: AccountSelectorProps) {
  
  // Convert accounts to hierarchical items
  const hierarchicalAccounts: Account[] = accounts.map(account => ({
    ...account,
    parentId: account.parentAccountId || account.parentAccount?.id || null
  }));

  // Account-specific display configuration
  const displayConfig: ItemDisplayConfig<Account> = {
    getIcon: (account) => {
      switch (account.accountType) {
        case 'ORGANIZATION':
          return <Building className="h-4 w-4" />;
        case 'SUBSIDIARY':
          return <Building2 className="h-4 w-4" />;
        case 'INDIVIDUAL':
          return <User className="h-4 w-4" />;
        default:
          return <Building className="h-4 w-4" />;
      }
    },
    
    getBadge: (account) => {
      const getVariant = (accountType: string) => {
        switch (accountType) {
          case 'ORGANIZATION':
            return 'default' as const;
          case 'SUBSIDIARY':
            return 'secondary' as const;
          case 'INDIVIDUAL':
            return 'outline' as const;
          default:
            return 'default' as const;
        }
      };
      
      return {
        text: account.accountType,
        variant: getVariant(account.accountType)
      };
    },
    
    getGroup: (account) => {
      switch (account.accountType) {
        case 'ORGANIZATION':
          return 'Organizations';
        case 'SUBSIDIARY':
          return 'Subsidiaries';
        case 'INDIVIDUAL':
          return 'Individuals';
        default:
          return 'Other';
      }
    },
    
    getSearchableText: (account) => {
      const searchableTexts = [account.name];
      if (account.companyName && account.companyName !== account.name) {
        searchableTexts.push(account.companyName);
      }
      return searchableTexts;
    }
  };

  // Account-specific filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'accountType',
      label: 'Account Type',
      icon: <Building className="h-3 w-3 mr-1" />,
      getValue: (account: Account) => account.accountType
    }
  ];

  return (
    <HierarchicalSelector<Account>
      items={hierarchicalAccounts}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      displayConfig={displayConfig}
      filterConfigs={enableFilters ? filterConfigs : []}
      enableGrouping={enableGrouping}
      enableSearch={true}
      enableFilters={enableFilters}
      allowClear={allowClear}
      searchPlaceholder="Search accounts..."
      emptyMessage="No accounts found"
      className={className}
    />
  );
}

// Re-export the Account interface for convenience
export type { Account };