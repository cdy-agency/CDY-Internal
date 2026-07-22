'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  AgentDashboard,
  ApiResponse,
  ClientActivityRecord,
  ClientInvoiceSummary,
  ClientRecord,
  ClientSearchResult,
  ConversionReport,
  CrmAuditLogRecord,
  CrmScoreWeights,
  CrmSummary,
  LeadActivityRecord,
  LeadOverdueFollowUp,
  LeadRecord,
  LeadSource,
  MonthlyTargetPerformance,
  PipelineColumn,
  PipelineStage,
  PipelineStageHistoryRecord,
  ProposalRecord,
  ProposalStatus,
  SalesPerformanceReport,
  SavedFilterRecord,
  SourceAnalysisReport,
} from '@cdy/shared';
import { format } from 'date-fns';

export function useCrmSummary() {
  return useQuery({
    queryKey: ['crm', 'summary'],
    queryFn: async (): Promise<CrmSummary> => {
      const res = await api.get<ApiResponse<CrmSummary>>('/crm/summary');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function usePipelineBoard() {
  return useQuery({
    queryKey: ['crm', 'pipeline'],
    queryFn: async (): Promise<PipelineColumn[]> => {
      const res = await api.get<ApiResponse<PipelineColumn[]>>('/crm/pipeline');
      return res.data.data;
    },
  });
}

export interface LeadFilters {
  stage?: PipelineStage;
  search?: string;
  assignedTo?: string;
  source?: LeadSource;
  serviceInterest?: string;
  minScore?: number;
  maxScore?: number;
  minValue?: number;
  maxValue?: number;
  dateFrom?: string;
  dateTo?: string;
  hasOverdueFollowUp?: boolean;
}

function leadFiltersToParams(filters: LeadFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.search) params.set('search', filters.search);
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
  if (filters.source) params.set('source', filters.source);
  if (filters.serviceInterest) params.set('serviceInterest', filters.serviceInterest);
  if (filters.minScore != null) params.set('minScore', String(filters.minScore));
  if (filters.maxScore != null) params.set('maxScore', String(filters.maxScore));
  if (filters.minValue != null) params.set('minValue', String(filters.minValue));
  if (filters.maxValue != null) params.set('maxValue', String(filters.maxValue));
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.hasOverdueFollowUp) params.set('hasOverdueFollowUp', 'true');
  return params;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'leads', filters],
    queryFn: async (): Promise<LeadRecord[]> => {
      const params = leadFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<ApiResponse<LeadRecord[]>>(
        `/crm/leads${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['crm', 'leads', id],
    queryFn: async (): Promise<
      LeadRecord & {
        activities: LeadActivityRecord[];
        proposals: ProposalRecord[];
        stageHistory: PipelineStageHistoryRecord[];
        overdueFollowUp: LeadOverdueFollowUp | null;
      }
    > => {
      const res = await api.get<
        ApiResponse<
          LeadRecord & {
            activities: LeadActivityRecord[];
            proposals: ProposalRecord[];
            stageHistory: PipelineStageHistoryRecord[];
            overdueFollowUp: LeadOverdueFollowUp | null;
          }
        >
      >(`/crm/leads/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useSalesAgents() {
  return useQuery({
    queryKey: ['crm', 'agents'],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<Array<{ id: string; firstName: string; lastName: string; email: string }>>
      >('/crm/leads/agents');
      return res.data.data;
    },
  });
}

export function useClients(search?: string, source?: string, ventureId?: string) {
  return useQuery({
    queryKey: ['crm', 'clients', search, source, ventureId],
    queryFn: async (): Promise<ClientRecord[]> => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (source) params.set('source', source);
      if (ventureId !== undefined) params.set('ventureId', ventureId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<ApiResponse<ClientRecord[]>>(`/crm/clients${qs}`);
      return res.data.data;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientType?: string;
      companyName?: string;
      contactName: string;
      email: string;
      phone?: string;
      country?: string;
      city?: string;
      address?: string;
      website?: string;
      industry?: string;
      notes?: string;
      assignedTo?: string;
      source?: string;
      primaryService?: string;
      serviceValue?: number;
      serviceCurrency?: string;
      ventureId?: string;
    }) => {
      const res = await api.post<ApiResponse<ClientRecord>>('/crm/clients', data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        companyName?: string;
        contactName?: string;
        email?: string;
        phone?: string;
        country?: string;
        city?: string;
        website?: string;
        industry?: string;
        notes?: string;
        assignedTo?: string;
        ventureId?: string | null;
      };
    }) => {
      const res = await api.patch<ApiResponse<ClientRecord>>(`/crm/clients/${id}`, data);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'clients', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/clients/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['crm', 'clients', id],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<
          ClientRecord & {
            financeSummary: {
              totalInvoiced: number;
              invoiceCount: number;
              outstanding: number;
              paid: number;
            };
            leads: Array<{
              id: string;
              contactName: string;
              stage: PipelineStage;
              estimatedValue: number | null;
              convertedAt: string | null;
              createdAt: string;
            }>;
            activities: ClientActivityRecord[];
            invoices: ClientInvoiceSummary[];
          }
        >
      >(`/crm/clients/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useClientSearch(query: string) {
  return useQuery({
    queryKey: ['crm', 'clients', 'lookup', query],
    queryFn: async (): Promise<ClientSearchResult[]> => {
      const res = await api.get<ApiResponse<ClientSearchResult[]>>(
        `/crm/clients/lookup?q=${encodeURIComponent(query)}`,
      );
      return res.data.data;
    },
    enabled: Boolean(query) && query.trim().length >= 2,
  });
}

export function useMoveLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      stage,
      lostReason,
      wonOutcome,
      finalValue,
      companyName,
      contactName,
      email,
      phone,
    }: {
      leadId: string;
      stage: PipelineStage;
      lostReason?: string;
      wonOutcome?: 'invoice' | 'retainer';
      finalValue?: number;
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
    }) => {
      const res = await api.patch<ApiResponse<LeadRecord>>(
        `/crm/leads/${leadId}/stage`,
        { stage, lostReason, wonOutcome, finalValue, companyName, contactName, email, phone },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post<ApiResponse<LeadRecord>>('/crm/leads', payload);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: Record<string, unknown>;
    }) => {
      const res = await api.patch<ApiResponse<LeadRecord>>(
        `/crm/leads/${leadId}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
      void queryClient.invalidateQueries({ queryKey: ['crm', 'leads', variables.leadId] });
    },
  });
}

export function currentMonthParam(): string {
  return format(new Date(), 'yyyy-MM');
}

export function useAgentDashboard(month: string) {
  return useQuery({
    queryKey: ['crm', 'agent-dashboard', month],
    queryFn: async (): Promise<AgentDashboard> => {
      const res = await api.get<ApiResponse<AgentDashboard>>(
        `/crm/targets/dashboard/me?month=${month}`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useMonthlyTargets(month: string) {
  return useQuery({
    queryKey: ['crm', 'targets', month],
    queryFn: async (): Promise<MonthlyTargetPerformance[]> => {
      const res = await api.get<ApiResponse<MonthlyTargetPerformance[]>>(
        `/crm/targets?month=${month}`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useSetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      agentId: string;
      month: string;
      revenueTarget: number;
      dealsTarget: number;
      currency?: string;
    }) => {
      const res = await api.post<ApiResponse<MonthlyTargetPerformance>>(
        '/crm/targets',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export interface ProposalFilters {
  status?: ProposalStatus;
  assignedTo?: string;
  search?: string;
}

export function useProposals(filters: ProposalFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'proposals', filters],
    queryFn: async (): Promise<ProposalRecord[]> => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();
      const res = await api.get<ApiResponse<ProposalRecord[]>>(
        `/crm/proposals${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      proposalId,
      status,
      rejectionReason,
    }: {
      leadId: string;
      proposalId: string;
      status: ProposalStatus;
      rejectionReason?: string;
    }) => {
      const res = await api.patch<ApiResponse<ProposalRecord>>(
        `/crm/leads/${leadId}/proposals/${proposalId}/status`,
        { status, rejectionReason },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      proposalId,
    }: {
      leadId: string;
      proposalId: string;
    }) => {
      await api.delete(`/crm/leads/${leadId}/proposals/${proposalId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export interface ConversionFilters {
  from?: string;
  to?: string;
}

export function useConversionReport(filters: ConversionFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'conversion-report', filters],
    queryFn: async (): Promise<ConversionReport> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<ConversionReport>>(
        `/crm/pipeline/conversion-report${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 300_000,
  });
}

export interface ReportPeriodFilters {
  from?: string;
  to?: string;
}

export function useSalesPerformanceReport(filters: ReportPeriodFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'reports', 'sales-performance', filters],
    queryFn: async (): Promise<SalesPerformanceReport> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<SalesPerformanceReport>>(
        `/crm/reports/sales-performance${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 300_000,
  });
}

export function useSourceAnalysisReport(filters: ReportPeriodFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'reports', 'source-analysis', filters],
    queryFn: async (): Promise<SourceAnalysisReport> => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<SourceAnalysisReport>>(
        `/crm/reports/source-analysis${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    staleTime: 300_000,
  });
}

export function useCrmSettings() {
  return useQuery({
    queryKey: ['crm', 'settings'],
    queryFn: async (): Promise<Record<string, string>> => {
      const res = await api.get<ApiResponse<Record<string, string>>>('/crm/settings');
      return res.data.data;
    },
  });
}

export function useLostReasons() {
  return useQuery({
    queryKey: ['crm', 'settings', 'lost-reasons'],
    queryFn: async (): Promise<string[]> => {
      const res = await api.get<ApiResponse<string[]>>('/crm/settings/lost-reasons');
      return res.data.data;
    },
  });
}

export function useUpdateCrmSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { key: string; value: string }) => {
      await api.patch('/crm/settings', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'settings'] });
    },
  });
}

export function useSavedFilters(module: string) {
  return useQuery({
    queryKey: ['crm', 'filters', module],
    queryFn: async (): Promise<SavedFilterRecord[]> => {
      const res = await api.get<ApiResponse<SavedFilterRecord[]>>(
        `/crm/filters?module=${encodeURIComponent(module)}`,
      );
      return res.data.data;
    },
  });
}

export function useSaveFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      module: string;
      name: string;
      filters: Record<string, unknown>;
    }) => {
      const res = await api.post<ApiResponse<SavedFilterRecord>>('/crm/filters', payload);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['crm', 'filters', variables.module],
      });
    },
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, module }: { id: string; module: string }) => {
      await api.delete(`/crm/filters/${id}`);
      return module;
    },
    onSuccess: (module) => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'filters', module] });
    },
  });
}

export function useBulkAssignLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { leadIds: string[]; agentId: string }) => {
      const res = await api.post<ApiResponse<{ updated: number }>>(
        '/crm/leads/bulk/assign',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export function useBulkMoveStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { leadIds: string[]; stage: PipelineStage }) => {
      const res = await api.post<ApiResponse<{ updated: number }>>(
        '/crm/leads/bulk/move-stage',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { leadIds: string[] }) => {
      const res = await api.post<ApiResponse<{ deleted: number }>>(
        '/crm/leads/bulk/delete',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm'] });
    },
  });
}

export interface CrmAuditFilters {
  page?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useCrmAuditLog(filters: CrmAuditFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const qs = params.toString();
      const res = await api.get<
        ApiResponse<{
          data: CrmAuditLogRecord[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >(`/crm/audit${qs ? `?${qs}` : ''}`);
      return res.data.data;
    },
  });
}

export async function exportLeadsCsv(filters: LeadFilters): Promise<void> {
  const params = leadFiltersToParams(filters);
  const response = await api.get(`/crm/leads/export?${params.toString()}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CDY-Leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportClientsCsv(search?: string): Promise<void> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await api.get(`/crm/clients/export${qs}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CDY-Clients-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseScoreWeights(raw: string | undefined): CrmScoreWeights {
  if (!raw) {
    return { source: 30, value: 30, contact: 20, engagement: 20 };
  }
  return JSON.parse(raw) as CrmScoreWeights;
}
