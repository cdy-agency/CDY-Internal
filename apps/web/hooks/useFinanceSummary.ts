'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, FinanceSummary } from '@cdy/shared';

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: async (): Promise<FinanceSummary> => {
      const response = await api.get<ApiResponse<FinanceSummary>>('/finance/summary');
      return response.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
