'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, PaginatedPayments } from '@cdy/shared';
import type { PaymentFilters } from '@/types/payment';

function buildQueryParams(filters: PaymentFilters): string {
  const params = new URLSearchParams();
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.method) params.set('method', filters.method);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async (): Promise<PaginatedPayments> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedPayments>>(
        `/payments${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
