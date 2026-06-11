'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  RetainerMRRSummary,
  RetainerRecord,
  RetainerStatus,
} from '@cdy/shared';

export interface RetainerFilters {
  status?: RetainerStatus;
  clientId?: string;
}

export function useRetainers(filters: RetainerFilters = {}) {
  return useQuery({
    queryKey: ['retainers', filters],
    queryFn: async (): Promise<RetainerRecord[]> => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const qs = params.toString();
      const response = await api.get<ApiResponse<RetainerRecord[]>>(
        `/retainers${qs ? `?${qs}` : ''}`,
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}

export function useRetainerSummary() {
  return useQuery({
    queryKey: ['retainers', 'summary'],
    queryFn: async (): Promise<RetainerMRRSummary> => {
      const response = await api.get<ApiResponse<RetainerMRRSummary>>(
        '/retainers/summary',
      );
      return response.data.data;
    },
    staleTime: 30_000,
  });
}
