import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  InfluencerCampaignListItem,
  InfluencerCampaignDetail,
  InfluencerWithCount,
  InfluencerDetail,
  CampaignInfluencerDetail,
  DeliverableRecord,
  CompleteCampaignResult,
} from '@cdy/shared';

// ─── Campaign queries ─────────────────────────────────────────

export function useCampaigns() {
  return useQuery({
    queryKey: ['influencer', 'campaigns'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InfluencerCampaignListItem[]>>(
        '/influencer/campaigns',
      );
      return res.data.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['influencer', 'campaigns', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InfluencerCampaignDetail>>(
        `/influencer/campaigns/${id}`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

// ─── Influencer database queries ──────────────────────────────

export function useInfluencers(filters?: {
  platform?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['influencer', 'database', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.platform) params.set('platform', filters.platform);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.search) params.set('search', filters.search);
      const res = await api.get<ApiResponse<InfluencerWithCount[]>>(
        `/influencer/database?${params.toString()}`,
      );
      return res.data.data;
    },
  });
}

export function useInfluencer(id: string) {
  return useQuery({
    queryKey: ['influencer', 'database', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<InfluencerDetail>>(
        `/influencer/database/${id}`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

// ─── Campaign mutations ───────────────────────────────────────

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      clientId: string;
      name: string;
      brief?: string;
      platforms: string[];
      budget?: string;
      currency?: string;
      totalCost?: string;
      startDate: string;
      endDate?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<InfluencerCampaignDetail>>(
        '/influencer/campaigns',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns'] }),
  });
}

export function useCompleteCampaign(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<CompleteCampaignResult>>(
        `/influencer/campaigns/${campaignId}/complete`,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['influencer'] }),
  });
}

// ─── Assignment mutations ─────────────────────────────────────

export function useAssignInfluencer(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      influencerId: string;
      agreedFee?: string;
      currency?: string;
      notes?: string;
      deliverables?: {
        description: string;
        platform: string;
        contentType: string;
        dueDate?: string;
      }[];
    }) => {
      const res = await api.post<ApiResponse<CampaignInfluencerDetail>>(
        `/influencer/campaigns/${campaignId}/assign`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns', campaignId] }),
  });
}

export function useLogPayment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { assignmentId: string; amount: string; notes?: string }) => {
      const res = await api.post<ApiResponse<CampaignInfluencerDetail>>(
        `/influencer/assignments/${dto.assignmentId}/pay`,
        { amount: dto.amount, notes: dto.notes },
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns', campaignId] }),
  });
}

// ─── Deliverable mutations ────────────────────────────────────

export function useVerifyDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deliverableId: string) => {
      const res = await api.patch<ApiResponse<DeliverableRecord>>(
        `/influencer/deliverables/${deliverableId}/verify`,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns', campaignId] }),
  });
}

export function useSubmitDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { deliverableId: string; postUrl?: string }) => {
      const res = await api.patch<ApiResponse<DeliverableRecord>>(
        `/influencer/deliverables/${dto.deliverableId}/submit`,
        { postUrl: dto.postUrl },
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns', campaignId] }),
  });
}

export function useMissedDeliverable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deliverableId: string) => {
      const res = await api.patch<ApiResponse<DeliverableRecord>>(
        `/influencer/deliverables/${deliverableId}/missed`,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns', campaignId] }),
  });
}

// ─── Influencer DB mutations ──────────────────────────────────

export function useCreateInfluencer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      handle: string;
      platform: string;
      otherPlatforms?: string[];
      followersCount?: number;
      email?: string;
      phone?: string;
      location?: string;
      category?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<InfluencerDetail>>(
        '/influencer/database',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['influencer', 'database'] }),
  });
}
