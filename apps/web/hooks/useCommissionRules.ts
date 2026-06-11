'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, CommissionRuleGroup } from '@cdy/shared';

export function useCommissionRules() {
  return useQuery({
    queryKey: ['commissions', 'rules'],
    queryFn: async (): Promise<CommissionRuleGroup[]> => {
      const res = await api.get<ApiResponse<CommissionRuleGroup[]>>(
        '/commissions/rules',
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
