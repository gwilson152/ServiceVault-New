import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface InvoiceGenerationData {
  accountId: string;
  startDate: string;
  endDate: string;
  includeUnbilledOnly: boolean;
  includeSubsidiaries: boolean;
  // Manual selection support
  selectedTimeEntryIds?: string[];
  selectedAddonIds?: string[];
}

export interface BillingRateData {
  name: string;
  rate: number;
  description?: string;
  isDefault: boolean;
}

// Generate invoice mutation
export function useGenerateInvoiceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InvoiceGenerationData) => {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate invoices query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// Create billing rate mutation
export function useCreateBillingRateMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: BillingRateData) => {
      const response = await fetch('/api/billing/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create billing rate');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate billing rates query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['billing', 'rates'] });
    },
  });
}

// Update billing rate mutation
export function useUpdateBillingRateMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ rateId, data }: { rateId: string; data: BillingRateData }) => {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update billing rate');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate billing rates query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['billing', 'rates'] });
    },
  });
}

// Delete billing rate mutation
export function useDeleteBillingRateMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rateId: string) => {
      const response = await fetch(`/api/billing/rates/${rateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete billing rate');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate billing rates query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['billing', 'rates'] });
    },
  });
}

// Delete invoice mutation
export function useDeleteInvoiceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate invoices query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}