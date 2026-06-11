'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  PlReportData,
  AgeingReportData,
  ExpenseReportData,
  CashFlowForecast,
  BalanceSheetData,
  CashFlowAdjustment,
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

export interface CashFlowFilters {
  weeks?: number;
  openingBalance?: number;
}

export function useCashFlowReport(filters: CashFlowFilters) {
  return useQuery({
    queryKey: ['reports', 'cashflow', filters],
    queryFn: async (): Promise<CashFlowForecast> => {
      const params = new URLSearchParams();
      if (filters.weeks) params.set('weeks', String(filters.weeks));
      if (filters.openingBalance !== undefined) {
        params.set('openingBalance', String(filters.openingBalance));
      }
      const qs = params.toString();
      const res = await api.get<ApiResponse<CashFlowForecast>>(
        `/reports/cashflow${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useBalanceSheetReport(date?: string) {
  return useQuery({
    queryKey: ['reports', 'balance-sheet', date],
    queryFn: async (): Promise<BalanceSheetData> => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const qs = params.toString();
      const res = await api.get<ApiResponse<BalanceSheetData>>(
        `/reports/balance-sheet${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export async function createCashFlowAdjustment(payload: {
  label: string;
  amount: number;
  direction: 'IN' | 'OUT';
  date: string;
}): Promise<CashFlowAdjustment> {
  const res = await api.post<ApiResponse<CashFlowAdjustment>>(
    '/reports/cashflow/adjustments',
    payload,
  );
  return res.data.data;
}

export async function deleteCashFlowAdjustment(id: string): Promise<void> {
  await api.delete(`/reports/cashflow/adjustments/${id}`);
}
