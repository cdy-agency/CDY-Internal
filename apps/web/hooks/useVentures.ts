'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  VentureRecord,
  AllVenturesSummary,
  VenturePeriodSummary,
} from '@cdy/shared';

export interface VentureSummaryFilters {
  from: string;
  to: string;
}

export interface VentureListFilters {
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
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

export function useVentureInvoices(ventureId: string, filters: VentureListFilters = {}) {
  return useQuery({
    queryKey: ['ventures', ventureId, 'invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ ventureId });
      if (filters.from) params.set('dateFrom', filters.from);
      if (filters.to) params.set('dateTo', filters.to);
      if (filters.status) params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const response = await api.get<ApiResponse<unknown>>(
        `/invoices?${params.toString()}`,
      );
      return response.data.data;
    },
    enabled: Boolean(ventureId),
    staleTime: 30_000,
  });
}

export function useVentureExpenses(ventureId: string, filters: VentureListFilters = {}) {
  return useQuery({
    queryKey: ['ventures', ventureId, 'expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ ventureId });
      if (filters.from) params.set('dateFrom', filters.from);
      if (filters.to) params.set('dateTo', filters.to);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const response = await api.get<ApiResponse<unknown>>(
        `/expenses?${params.toString()}`,
      );
      return response.data.data;
    },
    enabled: Boolean(ventureId),
    staleTime: 30_000,
  });
}

interface CreateVentureInput {
  name: string;
  description?: string;
  color?: string;
}

export function useCreateVenture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateVentureInput): Promise<VentureRecord> => {
      const response = await api.post<ApiResponse<VentureRecord>>('/ventures', data);
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ventures'] });
    },
  });
}

export function useUpdateVenture(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CreateVentureInput>): Promise<VentureRecord> => {
      const response = await api.patch<ApiResponse<VentureRecord>>(`/ventures/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ventures'] });
    },
  });
}

export function useDeactivateVenture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<VentureRecord> => {
      const response = await api.patch<ApiResponse<VentureRecord>>(`/ventures/${id}/deactivate`);
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ventures'] });
    },
  });
}
