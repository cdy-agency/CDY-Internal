'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';

export function useFinanceSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Record<string, string>> => {
      const res = await api.get<ApiResponse<Record<string, string>>>('/settings');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
