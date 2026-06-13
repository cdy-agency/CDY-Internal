'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  VentureRecord,
  AllVenturesSummary,
  VenturePeriodSummary,
  VentureIncomeRecord,
  VentureExpenseRecord,
} from '@cdy/shared';

export interface VentureSummaryFilters {
  from: string;
  to: string;
}

export interface VentureIncomeFilters {
  from?: string;
  to?: string;
  category?: string;
}

export function useVentures(includeInactive = false) {
  return useQuery({
    queryKey: ['ventures', { includeInactive }],
    queryFn: async (): Promise<VentureRecord[]> => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const response = await api.get<ApiResponse<VentureRecord[]>>(
        `/ventures${params}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useAllVenturesSummary(filters: VentureSummaryFilters) {
  return useQuery({
    queryKey: ['ventures', 'summary', filters],
    queryFn: async (): Promise<AllVenturesSummary> => {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });
      const response = await api.get<ApiResponse<AllVenturesSummary>>(
        `/ventures/summary?${params.toString()}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useVenture(id: string) {
  return useQuery({
    queryKey: ['ventures', id],
    queryFn: async (): Promise<VentureRecord> => {
      const response = await api.get<ApiResponse<VentureRecord>>(
        `/ventures/${id}`,
      );
      return response.data.data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useVentureSummary(id: string, filters: VentureSummaryFilters) {
  return useQuery({
    queryKey: ['ventures', id, 'summary', filters],
    queryFn: async (): Promise<VenturePeriodSummary> => {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });
      const response = await api.get<ApiResponse<VenturePeriodSummary>>(
        `/ventures/${id}/summary?${params.toString()}`,
      );
      return response.data.data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useVentureIncome(
  ventureId: string,
  filters: VentureIncomeFilters = {},
) {
  return useQuery({
    queryKey: ['ventures', ventureId, 'income', filters],
    queryFn: async (): Promise<VentureIncomeRecord[]> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.category) params.set('category', filters.category);
      const qs = params.toString();
      const response = await api.get<ApiResponse<VentureIncomeRecord[]>>(
        `/ventures/${ventureId}/income${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    enabled: Boolean(ventureId),
    staleTime: 30_000,
  });
}

export function useVentureExpenses(
  ventureId: string,
  filters: VentureIncomeFilters = {},
) {
  return useQuery({
    queryKey: ['ventures', ventureId, 'expenses', filters],
    queryFn: async (): Promise<VentureExpenseRecord[]> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.category) params.set('category', filters.category);
      const qs = params.toString();
      const response = await api.get<ApiResponse<VentureExpenseRecord[]>>(
        `/ventures/${ventureId}/expenses${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    enabled: Boolean(ventureId),
    staleTime: 30_000,
  });
}
