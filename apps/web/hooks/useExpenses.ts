'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, PaginatedExpenses } from '@cdy/shared';
import type { ExpenseFilters } from '@/types/expense';

function buildQueryParams(filters: ExpenseFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.ventureId) params.set('ventureId', filters.ventureId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async (): Promise<PaginatedExpenses> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedExpenses>>(
        `/expenses${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
