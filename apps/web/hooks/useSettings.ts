'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await api.patch<ApiResponse<Record<string, string>>>('/settings', {
        key,
        value,
      });
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void queryClient.invalidateQueries({ queryKey: ['ceo', 'summary'] });
      void queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}
