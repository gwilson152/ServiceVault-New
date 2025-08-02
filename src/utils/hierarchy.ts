// Hierarchy processing utilities for account data

export interface AccountWithHierarchy {
  id: string;
  name: string;
  accountType: string;
  companyName?: string;
  parentAccount?: { id: string; name: string; accountType: string };
  childAccounts: Array<{ id: string; name: string; accountType: string }>;
  accountUsers: Array<{
    id: string;
    name: string;
    email: string;
    user?: { id: string; name: string; email: string };
  }>;
  stats: {
    activeUsers: number;
    pendingInvitations: number;
    totalUsers: number;
    totalTickets: number;
    totalHours: number;
    billableHours: number;
  };
  // Computed hierarchy properties
  depth?: number;
  children?: AccountWithHierarchy[];
  path?: string;
  isExpanded?: boolean;
}

/**
 * Build a hierarchical tree structure from a flat array of accounts
 */
export function buildAccountHierarchy(accounts: AccountWithHierarchy[]): AccountWithHierarchy[] {
  // Create a map for quick lookup
  const accountMap = new Map<string, AccountWithHierarchy>();
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], depth: 0, isExpanded: true });
  });

  // Build the hierarchy
  const rootAccounts: AccountWithHierarchy[] = [];
  
  accounts.forEach(account => {
    const currentAccount = accountMap.get(account.id)!;
    
    if (account.parentAccount?.id) {
      // This is a child account
      const parent = accountMap.get(account.parentAccount.id);
      if (parent) {
        parent.children!.push(currentAccount);
        currentAccount.depth = (parent.depth || 0) + 1;
      } else {
        // Parent not found, treat as root
        rootAccounts.push(currentAccount);
      }
    } else {
      // This is a root account
      rootAccounts.push(currentAccount);
    }
  });

  // Calculate paths for all accounts
  const calculatePaths = (accounts: AccountWithHierarchy[], parentPath = ""): void => {
    accounts.forEach(account => {
      account.path = parentPath ? `${parentPath} > ${account.name}` : account.name;
      if (account.children && account.children.length > 0) {
        calculatePaths(account.children, account.path);
      }
    });
  };

  calculatePaths(rootAccounts);
  
  return rootAccounts;
}

/**
 * Flatten hierarchical accounts into a linear array while preserving hierarchy info
 */
export function flattenAccountHierarchy(hierarchicalAccounts: AccountWithHierarchy[]): AccountWithHierarchy[] {
  const flattened: AccountWithHierarchy[] = [];
  
  const flatten = (accounts: AccountWithHierarchy[]): void => {
    accounts.forEach(account => {
      flattened.push(account);
      if (account.children && account.children.length > 0 && account.isExpanded) {
        flatten(account.children);
      }
    });
  };
  
  flatten(hierarchicalAccounts);
  return flattened;
}

/**
 * Group accounts by their parent for grid display
 */
export function groupAccountsByParent(accounts: AccountWithHierarchy[]): {
  orphanAccounts: AccountWithHierarchy[];
  accountGroups: { parent: AccountWithHierarchy; children: AccountWithHierarchy[] }[];
} {
  const hierarchy = buildAccountHierarchy(accounts);
  const orphanAccounts: AccountWithHierarchy[] = [];
  const accountGroups: { parent: AccountWithHierarchy; children: AccountWithHierarchy[] }[] = [];
  
  hierarchy.forEach(account => {
    if (account.children && account.children.length > 0) {
      accountGroups.push({
        parent: account,
        children: account.children
      });
    } else {
      orphanAccounts.push(account);
    }
  });
  
  return { orphanAccounts, accountGroups };
}

/**
 * Toggle expansion state of an account and its children
 */
export function toggleAccountExpansion(
  accounts: AccountWithHierarchy[], 
  accountId: string
): AccountWithHierarchy[] {
  return accounts.map(account => {
    if (account.id === accountId) {
      return { ...account, isExpanded: !account.isExpanded };
    }
    if (account.children && account.children.length > 0) {
      return {
        ...account,
        children: toggleAccountExpansion(account.children, accountId)
      };
    }
    return account;
  });
}

/**
 * Search accounts across the hierarchy
 */
export function searchAccountsInHierarchy(
  accounts: AccountWithHierarchy[], 
  searchTerm: string
): AccountWithHierarchy[] {
  if (!searchTerm.trim()) return accounts;
  
  const term = searchTerm.toLowerCase();
  const matchesSearch = (account: AccountWithHierarchy): boolean => {
    return (
      account.name.toLowerCase().includes(term) ||
      (account.companyName && account.companyName.toLowerCase().includes(term)) ||
      (account.path && account.path.toLowerCase().includes(term))
    );
  };
  
  const filterHierarchy = (accounts: AccountWithHierarchy[]): AccountWithHierarchy[] => {
    const filtered: AccountWithHierarchy[] = [];
    
    accounts.forEach(account => {
      const accountMatches = matchesSearch(account);
      const childMatches = account.children ? filterHierarchy(account.children) : [];
      
      if (accountMatches || childMatches.length > 0) {
        filtered.push({
          ...account,
          children: childMatches,
          isExpanded: childMatches.length > 0 ? true : account.isExpanded
        });
      }
    });
    
    return filtered;
  };
  
  return filterHierarchy(accounts);
}

/**
 * Get account statistics including hierarchy information
 */
export function getHierarchyStats(accounts: AccountWithHierarchy[]): {
  totalAccounts: number;
  organizationCount: number;
  subsidiaryCount: number;
  individualCount: number;
  maxDepth: number;
  totalUsers: number;
  totalActiveUsers: number;
} {
  const flattened = flattenAccountHierarchy(buildAccountHierarchy(accounts));
  
  return {
    totalAccounts: flattened.length,
    organizationCount: flattened.filter(a => a.accountType === 'ORGANIZATION').length,
    subsidiaryCount: flattened.filter(a => a.accountType === 'SUBSIDIARY').length,
    individualCount: flattened.filter(a => a.accountType === 'INDIVIDUAL').length,
    maxDepth: Math.max(...flattened.map(a => a.depth || 0)),
    totalUsers: flattened.reduce((sum, a) => sum + a.stats.totalUsers, 0),
    totalActiveUsers: flattened.reduce((sum, a) => sum + a.stats.activeUsers, 0)
  };
}

/**
 * Sort accounts within their hierarchy level
 */
export function sortAccountsInHierarchy(
  accounts: AccountWithHierarchy[], 
  sortBy: 'name' | 'accountType' | 'userCount' = 'name'
): AccountWithHierarchy[] {
  const sortFunction = (a: AccountWithHierarchy, b: AccountWithHierarchy) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'accountType':
        const typeOrder = { 'ORGANIZATION': 0, 'SUBSIDIARY': 1, 'INDIVIDUAL': 2 };
        return (typeOrder[a.accountType as keyof typeof typeOrder] || 3) - 
               (typeOrder[b.accountType as keyof typeof typeOrder] || 3);
      case 'userCount':
        return b.stats.totalUsers - a.stats.totalUsers;
      default:
        return 0;
    }
  };
  
  return accounts.map(account => ({
    ...account,
    children: account.children ? sortAccountsInHierarchy(account.children, sortBy) : []
  })).sort(sortFunction);
}