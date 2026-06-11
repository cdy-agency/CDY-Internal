'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  PlReportData,
  AgeingReportData,
  ExpenseReportData,
} from '@cdy/shared';

export interface PlFilters {
  from?: string;
  to?: string;
  serviceType?: string;
}

export interface AgeingFilters {
  clientId?: string;
}

export interface ExpenseReportFilters {
  month?: string;
  category?: string;
}

export function usePlReport(filters: PlFilters) {
  return useQuery({
    queryKey: ['reports', 'pl', filters],
    queryFn: async (): Promise<PlReportData> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.serviceType) params.set('serviceType', filters.serviceType);
      const qs = params.toString();
      const res = await api.get<ApiResponse<PlReportData>>(
        `/reports/pl${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 300_000,
  });
}

export function useAgeingReport(filters: AgeingFilters) {
  return useQuery({
    queryKey: ['reports', 'ageing', filters],
    queryFn: async (): Promise<AgeingReportData> => {
      const params = new URLSearchParams();
      if (filters.clientId) params.set('clientId', filters.clientId);
      const qs = params.toString();
      const res = await api.get<ApiResponse<AgeingReportData>>(
        `/reports/ageing${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useExpenseReport(filters: ExpenseReportFilters) {
  return useQuery({
    queryKey: ['reports', 'expenses', filters],
    queryFn: async (): Promise<ExpenseReportData> => {
      const params = new URLSearchParams();
      if (filters.month) params.set('month', filters.month);
      if (filters.category) params.set('category', filters.category);
      const qs = params.toString();
      const res = await api.get<ApiResponse<ExpenseReportData>>(
        `/reports/expenses${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 300_000,
  });
}
