'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, ArLedgerData, ArRiskLevel } from '@cdy/shared';

export interface ArLedgerFilters {
  clientId?: string;
  overdueOnly?: boolean;
  riskLevel?: ArRiskLevel;
}

function buildQueryParams(filters: ArLedgerFilters): string {
  const params = new URLSearchParams();
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.overdueOnly) params.set('overdueOnly', 'true');
  if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
  return params.toString();
}

export function useArLedger(filters: ArLedgerFilters) {
  return useQuery({
    queryKey: ['ar', 'ledger', filters],
    queryFn: async (): Promise<ArLedgerData> => {
      const qs = buildQueryParams(filters);
      const response = await api.get<ApiResponse<ArLedgerData>>(
        `/ar${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
