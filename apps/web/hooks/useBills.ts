'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, PaginatedBills } from '@cdy/shared';
import type { BillFilters } from '@/types/bill';

function buildQueryParams(filters: BillFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.overdue) params.set('overdue', 'true');
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useBills(filters: BillFilters) {
  return useQuery({
    queryKey: ['bills', filters],
    queryFn: async (): Promise<PaginatedBills> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedBills>>(
        `/bills${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
