'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  BankStatementRecord,
  ReconciliationDetail,
  ReconciliationStatus,
} from '@cdy/shared';

export interface ReconciliationFilters {
  status?: ReconciliationStatus;
}

function buildQueryParams(filters: ReconciliationFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  return params.toString();
}

export function useReconciliationList(filters: ReconciliationFilters = {}) {
  return useQuery({
    queryKey: ['reconciliation', 'list', filters],
    queryFn: async (): Promise<BankStatementRecord[]> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<BankStatementRecord[]>>(
        `/reconciliation${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useReconciliationDetail(id: string) {
  return useQuery({
    queryKey: ['reconciliation', id],
    queryFn: async (): Promise<ReconciliationDetail> => {
      const response = await api.get<ApiResponse<ReconciliationDetail>>(
        `/reconciliation/${id}`,
      );
      return response.data.data;
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}
