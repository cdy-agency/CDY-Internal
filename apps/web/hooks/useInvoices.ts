'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, PaginatedInvoices } from '@cdy/shared';
import type { InvoiceFilters } from '@/types/invoice';

function buildQueryParams(filters: InvoiceFilters): string {
  const params = new URLSearchParams();
  if (filters.status?.length) {
    params.set('status', filters.status.join(','));
  }
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async (): Promise<PaginatedInvoices> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedInvoices>>(
        `/invoices${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
