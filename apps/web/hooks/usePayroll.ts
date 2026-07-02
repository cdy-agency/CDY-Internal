'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  PayrollLineItem,
  PayrollRun,
  EmployeeSalary,
} from '@cdy/shared';

export function usePayrollRuns(month?: string) {
  return useQuery({
    queryKey: ['payroll', 'runs', month],
    queryFn: async (): Promise<PayrollRun[]> => {
      const qs = month ? `?month=${month}` : '';
      const res = await api.get<ApiResponse<PayrollRun[]>>(`/payroll/runs${qs}`);
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: ['payroll', 'run', id],
    queryFn: async (): Promise<PayrollRun> => {
      const res = await api.get<ApiResponse<PayrollRun>>(`/payroll/runs/${id}`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function usePayrollPreview(month: string) {
  return useQuery({
    queryKey: ['payroll', 'preview', month],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<{
          employeeCount: number;
          approvedCommissionTotal: number;
          agentCount: number;
          estimatedTotalNet: number;
        }>
      >(`/payroll/runs/preview?month=${month}`);
      return res.data.data;
    },
    enabled: !!month,
    staleTime: 30_000,
  });
}

export function useMarkPayrollItemPaid(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string): Promise<PayrollLineItem> => {
      const res = await api.patch<ApiResponse<PayrollLineItem>>(
        `/payroll/runs/${runId}/items/${itemId}/mark-paid`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payroll', 'run', runId] });
    },
  });
}

export function useEmployeeSalaries() {
  return useQuery({
    queryKey: ['payroll', 'salaries'],
    queryFn: async (): Promise<EmployeeSalary[]> => {
      const res = await api.get<ApiResponse<EmployeeSalary[]>>('/payroll/salaries');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
