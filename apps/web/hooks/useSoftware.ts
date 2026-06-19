'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  SoftwareProjectListItem,
  SoftwareProjectDetail,
  RequirementDocRecord,
  DesignPhaseRecord,
  DevSprintRecord,
  SprintItemRecord,
  QaPhaseRecord,
  BugRecord,
  DeploymentRecord,
  MaintenanceLogRecord,
} from '@cdy/shared';
import type { ItemStatus, BugStatus } from '@cdy/shared';

// ─── Projects ────────────────────────────────────────────────

export function useSoftwareProjects() {
  return useQuery({
    queryKey: ['software', 'projects'],
    queryFn: async (): Promise<SoftwareProjectListItem[]> => {
      const res = await api.get<ApiResponse<SoftwareProjectListItem[]>>(
        '/software/projects',
      );
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useSoftwareProject(id: string) {
  return useQuery({
    queryKey: ['software', 'projects', id],
    queryFn: async (): Promise<SoftwareProjectDetail> => {
      const res = await api.get<ApiResponse<SoftwareProjectDetail>>(
        `/software/projects/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateSoftwareProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      clientId: string;
      name: string;
      projectType?: string;
      startDate: string;
      description?: string;
      projectId?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<SoftwareProjectDetail>>(
        '/software/projects',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects'] });
    },
  });
}

export function useAdvancePhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<SoftwareProjectDetail>>(
        `/software/projects/${projectId}/advance`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
      void qc.invalidateQueries({ queryKey: ['software', 'projects'] });
    },
  });
}

// ─── Requirements ─────────────────────────────────────────────

export function useCreateRequirementDoc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      fileUrl?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<RequirementDocRecord>>(
        `/software/projects/${projectId}/requirements`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useRequirementDocAction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docId,
      action,
    }: {
      docId: string;
      action: 'send' | 'sign' | 'revise';
    }) => {
      const res = await api.patch<ApiResponse<RequirementDocRecord>>(
        `/software/projects/${projectId}/requirements/${docId}/${action}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

// ─── Design ───────────────────────────────────────────────────

export function useUpdateDesignPhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { figmaUrl?: string; notes?: string }) => {
      const res = await api.patch<ApiResponse<DesignPhaseRecord>>(
        `/software/projects/${projectId}/design`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useDesignAction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: 'skip' | 'approve' | 'changes') => {
      const res = await api.post<ApiResponse<DesignPhaseRecord>>(
        `/software/projects/${projectId}/design/${action}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

// ─── Sprints ──────────────────────────────────────────────────

export function useCreateSprint(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      goal?: string;
      startDate: string;
      endDate: string;
    }) => {
      const res = await api.post<ApiResponse<DevSprintRecord>>(
        `/software/projects/${projectId}/sprints`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useSprintAction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sprintId,
      action,
    }: {
      sprintId: string;
      action: 'start' | 'complete';
    }) => {
      const res = await api.patch<ApiResponse<DevSprintRecord>>(
        `/software/projects/${projectId}/sprints/${sprintId}/${action}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useAddSprintItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sprintId,
      title,
      description,
      assigneeId,
      storyPoints,
    }: {
      sprintId: string;
      title: string;
      description?: string;
      assigneeId?: string;
      storyPoints?: number;
    }) => {
      const res = await api.post<ApiResponse<SprintItemRecord>>(
        `/software/projects/${projectId}/sprints/${sprintId}/items`,
        { title, description, assigneeId, storyPoints },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useUpdateItemStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sprintId,
      itemId,
      status,
    }: {
      sprintId: string;
      itemId: string;
      status: ItemStatus;
    }) => {
      const res = await api.patch<ApiResponse<SprintItemRecord>>(
        `/software/projects/${projectId}/sprints/${sprintId}/items/${itemId}/status`,
        { status },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

// ─── QA ───────────────────────────────────────────────────────

export function useQaAction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: 'skip' | 'complete') => {
      const res = await api.post<ApiResponse<QaPhaseRecord>>(
        `/software/projects/${projectId}/qa/${action}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useLogBug(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      severity?: string;
      assigneeId?: string;
    }) => {
      const res = await api.post<ApiResponse<BugRecord>>(
        `/software/projects/${projectId}/qa/bugs`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useUpdateBugStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bugId,
      status,
    }: {
      bugId: string;
      status: BugStatus;
    }) => {
      const res = await api.patch<ApiResponse<BugRecord>>(
        `/software/projects/${projectId}/qa/bugs/${bugId}/status`,
        { status },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

// ─── Deployment & Maintenance ─────────────────────────────────

export function useDeployProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      deployedAt?: string;
      deploymentUrl?: string;
      serverDetails?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<DeploymentRecord>>(
        `/software/projects/${projectId}/deploy`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
      void qc.invalidateQueries({ queryKey: ['software', 'projects'] });
    },
  });
}

export function useLogMaintenanceIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      type: string;
      priority?: string;
      assigneeId?: string;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<MaintenanceLogRecord>>(
        `/software/projects/${projectId}/maintenance`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}

export function useResolveMaintenanceIssue(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const res = await api.patch<ApiResponse<MaintenanceLogRecord>>(
        `/software/projects/${projectId}/maintenance/${logId}/resolve`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['software', 'projects', projectId] });
    },
  });
}
