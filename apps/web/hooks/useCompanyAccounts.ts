'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, CompanyAccountRecord, CompanyAccountType } from '@cdy/shared';

export function useCompanyAccounts() {
  return useQuery({
    queryKey: ['company-accounts'],
    queryFn: async (): Promise<CompanyAccountRecord[]> => {
      const response = await api.get<ApiResponse<CompanyAccountRecord[]>>('/company-accounts');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export interface CompanyAccountLookupResult {
  id: string;
  name: string;
  type: CompanyAccountType;
  provider: string | null;
  currency: string | null;
}

/** Picker list — requires finance.accounts.lookup */
export function useCompanyAccountLookup() {
  return useQuery({
    queryKey: ['company-accounts', 'lookup'],
    queryFn: async (): Promise<CompanyAccountLookupResult[]> => {
      const response = await api.get<ApiResponse<CompanyAccountLookupResult[]>>(
        '/company-accounts/lookup',
      );
      return response.data.data;
    },
    staleTime: 60_000,
  });
}
