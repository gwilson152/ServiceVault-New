import { useQuery } from "@tanstack/react-query";

export interface Account {
  id: string;
  name: string;
  accountType: string;
  parentAccountId?: string | null;
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
  customFields?: any;
  createdAt: string;
  updatedAt: string;
  // Hierarchy relations
  parentAccount?: Account | null;
  childAccounts?: Account[];
}

export interface AccountsResponse {
  accounts: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AccountsParams {
  page?: number;
  limit?: number;
  search?: string;
  accountType?: string;
}

const fetchAccounts = async (params: AccountsParams = {}): Promise<AccountsResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.accountType && params.accountType !== 'ALL') {
    searchParams.append('accountType', params.accountType);
  }

  const url = `/api/accounts${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }
  
  return response.json();
};

const fetchAllAccounts = async (): Promise<Account[]> => {
  const response = await fetch('/api/accounts/all');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch all accounts: ${response.statusText}`);
  }
  
  return response.json();
};

// Hook for paginated accounts with filtering
export function useAccountsQuery(params: AccountsParams = {}) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => fetchAccounts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for all accounts (commonly used in selectors)
export function useAllAccountsQuery() {
  return useQuery({
    queryKey: ['accounts', 'all'],
    queryFn: fetchAllAccounts,
    staleTime: 10 * 60 * 1000, // 10 minutes - more stable data
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}