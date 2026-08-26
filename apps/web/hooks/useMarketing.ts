'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  MarketingClientRecord,
  ContentItemRecord,
  ContentCalendarResult,
  GlobalContentCalendarResult,
  TodaysContentResult,
  MarketingMonthlySummary,
  MarketingAllClientsSummaryItem,
} from '@cdy/shared';

export function useMarketingClients() {
  return useQuery({
    queryKey: ['marketing', 'clients'],
    queryFn: async (): Promise<MarketingClientRecord[]> => {
      const res = await api.get<ApiResponse<MarketingClientRecord[]>>(
        '/marketing/clients',
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useMarketingClient(id: string) {
  return useQuery({
    queryKey: ['marketing', 'clients', id],
    queryFn: async (): Promise<MarketingClientRecord> => {
      const res = await api.get<ApiResponse<MarketingClientRecord>>(
        `/marketing/clients/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useContentItems(
  clientId: string,
  month: string,
  platform?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ['marketing', 'content', clientId, month, platform, status],
    queryFn: async (): Promise<ContentItemRecord[]> => {
      const params = new URLSearchParams({ month });
      if (platform) params.set('platform', platform);
      if (status) params.set('status', status);
      const res = await api.get<ApiResponse<ContentItemRecord[]>>(
        `/marketing/clients/${clientId}/content?${params.toString()}`,
      );
      return res.data.data;
    },
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });
}

export function useContentCalendar(clientId: string, month: string) {
  return useQuery({
    queryKey: ['marketing', 'calendar', clientId, month],
    queryFn: async (): Promise<ContentCalendarResult> => {
      const res = await api.get<ApiResponse<ContentCalendarResult>>(
        `/marketing/clients/${clientId}/calendar?month=${month}`,
      );
      return res.data.data;
    },
    enabled: Boolean(clientId) && Boolean(month),
    staleTime: 30_000,
  });
}

export function useGlobalContentCalendar(month: string) {
  return useQuery({
    queryKey: ['marketing', 'calendar', 'all', month],
    queryFn: async (): Promise<GlobalContentCalendarResult> => {
      const res = await api.get<ApiResponse<GlobalContentCalendarResult>>(
        `/marketing/calendar?month=${month}`,
      );
      return res.data.data;
    },
    enabled: Boolean(month),
    staleTime: 30_000,
  });
}

export function useTodaysContent() {
  return useQuery({
    queryKey: ['marketing', 'calendar', 'today'],
    queryFn: async (): Promise<TodaysContentResult> => {
      const res = await api.get<ApiResponse<TodaysContentResult>>(
        '/marketing/calendar/today',
      );
      return res.data.data;
    },
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useMarketingMonthlySummary(clientId: string, month: string) {
  return useQuery({
    queryKey: ['marketing', 'summary', clientId, month],
    queryFn: async (): Promise<MarketingMonthlySummary> => {
      const res = await api.get<ApiResponse<MarketingMonthlySummary>>(
        `/marketing/clients/${clientId}/summary?month=${month}`,
      );
      return res.data.data;
    },
    enabled: Boolean(clientId) && Boolean(month),
    staleTime: 30_000,
  });
}

export function useAllMarketingSummary(month: string) {
  return useQuery({
    queryKey: ['marketing', 'summary', 'all', month],
    queryFn: async (): Promise<MarketingAllClientsSummaryItem[]> => {
      const res = await api.get<ApiResponse<MarketingAllClientsSummaryItem[]>>(
        `/marketing/summary?month=${month}`,
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateMarketingClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      retainerId: string;
      platforms: string[];
      postsPerMonth?: number;
      projectId?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<MarketingClientRecord>>(
        '/marketing/clients',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketing'] });
    },
  });
}

export function useCreateContentItem(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      title: string;
      description?: string;
      platform: string;
      contentType: string;
      scheduledDate: string;
      fileUrl?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<ContentItemRecord>>(
        `/marketing/clients/${clientId}/content`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'content', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'summary', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', 'all'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', 'today'],
      });
    },
  });
}

export function useUpdateContentStatus(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: string;
    }) => {
      const res = await api.patch<ApiResponse<ContentItemRecord>>(
        `/marketing/clients/${clientId}/content/${itemId}/status`,
        { status },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'content', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'summary', clientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', 'all'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['marketing', 'calendar', 'today'],
      });
    },
  });
}
