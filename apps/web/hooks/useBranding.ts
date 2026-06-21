import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  BrandingProjectListItem,
  BrandingProjectDetail,
  BrandingScopeItemRecord,
  DesignSubmissionRecord,
  BrandingSupplierRecord,
  DeliverProjectResult,
} from '@cdy/shared';

// ─── Project queries ──────────────────────────────────────────

export function useBrandingProjects() {
  return useQuery({
    queryKey: ['branding', 'projects'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BrandingProjectListItem[]>>(
        '/branding/projects',
      );
      return res.data.data;
    },
  });
}

export function useBrandingProject(id: string) {
  return useQuery({
    queryKey: ['branding', 'projects', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BrandingProjectDetail>>(
        `/branding/projects/${id}`,
      );
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['branding', 'suppliers'],
    queryFn: async () => {
      const res =
        await api.get<ApiResponse<BrandingSupplierRecord[]>>('/branding/suppliers');
      return res.data.data;
    },
  });
}

// ─── Project mutations ────────────────────────────────────────

export function useCreateBrandingProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      clientId: string;
      name: string;
      description?: string;
      totalCost?: string;
      currency?: string;
      notes?: string;
      scopeItems?: { title: string; description?: string }[];
    }) => {
      const res = await api.post<ApiResponse<BrandingProjectDetail>>(
        '/branding/projects',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['branding'] }),
  });
}

export function useAddScopeItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      title: string;
      description?: string;
      supplierId?: string;
    }) => {
      const res = await api.post<ApiResponse<BrandingScopeItemRecord>>(
        `/branding/projects/${projectId}/scope`,
        dto,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['branding', 'projects', projectId] }),
  });
}

export function useDeliverProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<DeliverProjectResult>>(
        `/branding/projects/${projectId}/deliver`,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['branding'] }),
  });
}

// ─── Submission mutations ─────────────────────────────────────

export function useSubmitDesign(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      scopeItemId: string;
      fileUrl?: string;
      description?: string;
    }) => {
      const res = await api.post<ApiResponse<DesignSubmissionRecord>>(
        `/branding/scope/${dto.scopeItemId}/submit`,
        { fileUrl: dto.fileUrl, description: dto.description },
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['branding', 'projects', projectId] }),
  });
}

export function useReviewSubmission(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      submissionId: string;
      decision: 'APPROVE' | 'REJECT';
      clientFeedback?: string;
    }) => {
      const res = await api.post<ApiResponse<DesignSubmissionRecord>>(
        `/branding/submissions/${dto.submissionId}/review`,
        { decision: dto.decision, clientFeedback: dto.clientFeedback },
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['branding', 'projects', projectId] }),
  });
}

// ─── Supplier mutations ───────────────────────────────────────

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
    }) => {
      const res = await api.post<ApiResponse<BrandingSupplierRecord>>(
        '/branding/suppliers',
        dto,
      );
      return res.data.data;
    },
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['branding', 'suppliers'] }),
  });
}
