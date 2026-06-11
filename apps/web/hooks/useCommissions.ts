'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, PaginatedCommissions, CommissionStatus } from '@cdy/shared';

export interface CommissionFilters {
  month: string;
  agentId?: string;
  status?: CommissionStatus;
  page?: number;
  limit?: number;
}

function buildParams(filters: CommissionFilters): string {
  const params = new URLSearchParams();
  params.set('month', filters.month);
  if (filters.agentId) params.set('agentId', filters.agentId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useCommissions(filters: CommissionFilters, myOnly = false) {
  return useQuery({
    queryKey: ['commissions', myOnly ? 'my' : 'all', filters],
    queryFn: async (): Promise<PaginatedCommissions> => {
      const qs = buildParams(filters);
      const path = myOnly ? '/commissions/my' : '/commissions';
      const res = await api.get<ApiResponse<PaginatedCommissions>>(
        `${path}?${qs}`,
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}
