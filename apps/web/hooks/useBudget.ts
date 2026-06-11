'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  BudgetIncreaseRequestRecord,
  ProjectBudgetStatus,
} from '@cdy/shared';

export function useProjectBudgets() {
  return useQuery({
    queryKey: ['budget', 'list'],
    queryFn: async (): Promise<ProjectBudgetStatus[]> => {
      const response = await api.get<ApiResponse<ProjectBudgetStatus[]>>(
        '/budget',
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: async (): Promise<ProjectBudgetStatus> => {
      const response = await api.get<ApiResponse<ProjectBudgetStatus>>(
        `/budget/${projectId}`,
      );
      return response.data.data;
    },
    enabled: Boolean(projectId),
    staleTime: 15_000,
  });
}

export function usePendingBudgetRequests() {
  return useQuery({
    queryKey: ['budget', 'increase-requests'],
    queryFn: async (): Promise<BudgetIncreaseRequestRecord[]> => {
      const response = await api.get<
        ApiResponse<BudgetIncreaseRequestRecord[]>
      >('/budget/increase-requests');
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
