'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, FinanceSummary } from '@cdy/shared';

interface FinanceSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

export function useFinanceSummary(params?: FinanceSummaryParams) {
  const { dateFrom, dateTo } = params ?? {};
  return useQuery({
    queryKey: ['finance', 'summary', dateFrom ?? '', dateTo ?? ''],
    queryFn: async (): Promise<FinanceSummary> => {
      const searchParams = new URLSearchParams();
      if (dateFrom) searchParams.set('dateFrom', dateFrom);
      if (dateTo) searchParams.set('dateTo', dateTo);
      const qs = searchParams.toString();
      const url = qs ? `/finance/summary?${qs}` : '/finance/summary';
      const response = await api.get<ApiResponse<FinanceSummary>>(url);
      return response.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
