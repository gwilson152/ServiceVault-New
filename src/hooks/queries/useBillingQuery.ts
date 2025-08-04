import { useQuery } from "@tanstack/react-query";

export interface BillingRate {
  id: string;
  name: string;
  rate: number;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  accountId: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  account: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const fetchBillingRates = async (): Promise<BillingRate[]> => {
  const response = await fetch('/api/billing/rates');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch billing rates: ${response.statusText}`);
  }
  
  return response.json();
};

const fetchInvoices = async (): Promise<Invoice[]> => {
  const response = await fetch('/api/invoices');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch invoices: ${response.statusText}`);
  }
  
  return response.json();
};

// Hook for billing rates
export function useBillingRatesQuery() {
  return useQuery({
    queryKey: ['billing', 'rates'],
    queryFn: fetchBillingRates,
    staleTime: 10 * 60 * 1000, // 10 minutes - rates don't change often
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook for invoices
export function useInvoicesQuery() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
    staleTime: 2 * 60 * 1000, // 2 minutes - invoices change more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}