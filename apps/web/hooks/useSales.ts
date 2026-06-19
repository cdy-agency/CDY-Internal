import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  SalesCampaignListItem,
  SalesCampaignDetail,
  DailyActivityLogRecord,
  WeeklyReportRecord,
  AgentPerformance,
  ClientReportResponse,
} from '@cdy/shared';

// ─── Campaign queries ─────────────────────────────────────────

export function useSalesCampaigns() {
  return useQuery({
    queryKey: ['sales', 'campaigns'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SalesCampaignListItem[]>>(
        '/sales/campaigns',
      );
      return res.data.data;
    },
  });
}

export function useSalesCampaign(id: string) {
  return useQuery({
    queryKey: ['sales', 'campaigns', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SalesCampaignDetail>>(
        `/sales/campaigns/${id}`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCampaignLogs(
  campaignId: string,
  from?: string,
  to?: string,
) {
  return useQuery({
    queryKey: ['sales', 'campaigns', campaignId, 'logs', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<ApiResponse<DailyActivityLogRecord[]>>(
        `/sales/campaigns/${campaignId}/logs?${params.toString()}`,
      );
      return res.data.data;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignReports(campaignId: string) {
  return useQuery({
    queryKey: ['sales', 'campaigns', campaignId, 'reports'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WeeklyReportRecord[]>>(
        `/sales/campaigns/${campaignId}/reports`,
      );
      return res.data.data;
    },
    enabled: !!campaignId,
  });
}

export function useAgentPerformance(agentId: string, enabled = true) {
  return useQuery({
    queryKey: ['sales', 'agents', agentId, 'performance'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AgentPerformance>>(
        `/sales/agents/${agentId}/performance`,
      );
      return res.data.data;
    },
    enabled: !!agentId && enabled,
  });
}

export function useMyLogs(campaignId?: string) {
  return useQuery({
    queryKey: ['sales', 'logs', 'my', campaignId],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const res = await api.get<ApiResponse<DailyActivityLogRecord[]>>(
        `/sales/logs/my${params}`,
      );
      return res.data.data;
    },
  });
}

export function useClientReport(campaignId: string) {
  return useQuery({
    queryKey: ['sales', 'campaigns', campaignId, 'client-report'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ClientReportResponse>>(
        `/sales/campaigns/${campaignId}/client-report`,
      );
      return res.data.data;
    },
    enabled: !!campaignId,
  });
}

// ─── Campaign mutations ───────────────────────────────────────

export function useCreateSalesCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      clientId: string;
      name: string;
      productService: string;
      territory?: string;
      startDate: string;
      endDate?: string;
      visitTarget?: number;
      leadTarget?: number;
      salesTarget?: number;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<SalesCampaignDetail>>(
        '/sales/campaigns',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'campaigns'] }),
  });
}

export function useCompleteSalesCampaign(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<SalesCampaignDetail>>(
        `/sales/campaigns/${campaignId}/complete`,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

// ─── Agent mutations ──────────────────────────────────────────

export function useDeployAgent(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      employeeId: string;
      territory?: string;
      visitTarget?: number;
      leadTarget?: number;
      salesTarget?: number;
    }) => {
      const res = await api.post<ApiResponse<unknown>>(
        `/sales/campaigns/${campaignId}/agents`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['sales', 'campaigns', campaignId] }),
  });
}

export function useRemoveAgent(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      await api.delete(`/sales/agents/${agentId}`);
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['sales', 'campaigns', campaignId] }),
  });
}

// ─── Log mutations ────────────────────────────────────────────

export function useCreateLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      campaignId: string;
      employeeId?: string;
      date: string;
      visitsCount?: number;
      leadsCount?: number;
      salesCount?: number;
      salesAmount?: number;
      notes?: string;
      challenges?: string;
    }) => {
      const res = await api.post<ApiResponse<DailyActivityLogRecord>>(
        '/sales/logs',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'logs'] }),
  });
}

export function useUpdateLog(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      logId: string;
      visitsCount?: number;
      leadsCount?: number;
      salesCount?: number;
      salesAmount?: number;
      notes?: string;
      challenges?: string;
    }) => {
      const { logId, ...rest } = dto;
      const res = await api.patch<ApiResponse<DailyActivityLogRecord>>(
        `/sales/logs/${logId}`,
        rest,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sales', 'logs'] }),
  });
}

// ─── Report mutations ─────────────────────────────────────────

export function useGenerateWeeklyReport(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      weekNumber: number;
      weekStart: string;
      highlights?: string;
      challenges?: string;
      nextWeekPlan?: string;
    }) => {
      const res = await api.post<ApiResponse<WeeklyReportRecord>>(
        `/sales/campaigns/${campaignId}/reports`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: ['sales', 'campaigns', campaignId, 'reports'],
      }),
  });
}
