'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  TaxLiabilityReport,
  TaxRateRecord,
} from '@cdy/shared';

export interface TaxReportFilters {
  from?: string;
  to?: string;
}

export function useTaxRates() {
  return useQuery({
    queryKey: ['tax', 'rates'],
    queryFn: async (): Promise<TaxRateRecord[]> => {
      const response = await api.get<ApiResponse<TaxRateRecord[]>>('/tax/rates');
      return response.data.data;
    },
    staleTime: 60_000,
  });
}

export function useTaxReport(filters: TaxReportFilters) {
  return useQuery({
    queryKey: ['tax', 'report', filters],
    queryFn: async (): Promise<TaxLiabilityReport> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const response = await api.get<ApiResponse<TaxLiabilityReport>>(
        `/tax/report${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
