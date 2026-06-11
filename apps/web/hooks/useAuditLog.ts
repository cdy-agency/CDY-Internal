'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ApiResponse, AuditLogListResponse } from '@cdy/shared';

export interface AuditFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: async (): Promise<AuditLogListResponse> => {
      const params = new URLSearchParams();
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.page) params.set('page', String(filters.page));
      const qs = params.toString();
      const res = await api.get<ApiResponse<AuditLogListResponse>>(
        `/audit${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}
