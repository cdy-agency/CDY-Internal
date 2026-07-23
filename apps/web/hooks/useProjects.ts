'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApiResponse,
  CompleteProjectPayload,
  HandoverReport,
  PortfolioReport,
  PortfolioReportFilters,
  TaskImportResult,
  ApprovalDecision,
  CreateMilestonePayload,
  CreateProjectPayload,
  CreateTaskCommentPayload,
  CreateTaskPayload,
  DeliverableApprovalRecord,
  MilestoneRecord,
  MyTasksResponse,
  ProjectActivityRecord,
  ProjectProgress,
  ProjectRecord,
  ProjectStatus,
  ProjectStatusReport,
  ProjectSummary,
  RecordApprovalPayload,
  RequestApprovalPayload,
  TaskCommentRecord,
  TaskRecord,
  TaskStatus,
  TeamWorkloadResponse,
  UpdateMilestonePayload,
  UpdateProjectPayload,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from '@cdy/shared';

// ─── Summary ───────────────────────────────────────────────────

export function useProjectsSummary() {
  return useQuery({
    queryKey: ['projects', 'summary'],
    queryFn: async (): Promise<ProjectSummary> => {
      const res = await api.get<ApiResponse<ProjectSummary>>('/projects/summary');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

// ─── Projects ──────────────────────────────────────────────────

export interface ProjectFilters {
  status?: ProjectStatus;
  clientId?: string;
  managerId?: string;
  serviceType?: string;
  search?: string;
}

function projectFiltersToParams(filters: ProjectFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.managerId) params.set('managerId', filters.managerId);
  if (filters.serviceType) params.set('serviceType', filters.serviceType);
  if (filters.search) params.set('search', filters.search);
  return params;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: ['projects', 'list', filters],
    queryFn: async (): Promise<ProjectRecord[]> => {
      const params = projectFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<ApiResponse<ProjectRecord[]>>(
        `/projects${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export interface ProjectLookupResult {
  id: string;
  projectCode: string;
  name: string;
  status: string;
  serviceType: string;
  clientName: string | null;
}

/** Picker list — requires projects.lookup */
export function useProjectLookup(query = '') {
  return useQuery({
    queryKey: ['projects', 'lookup', query],
    queryFn: async (): Promise<ProjectLookupResult[]> => {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const res = await api.get<ApiResponse<ProjectLookupResult[]>>(
        `/projects/lookup${qs}`,
      );
      return res.data.data;
    },
  });
}

export function useMyProjects() {
  return useQuery({
    queryKey: ['projects', 'my'],
    queryFn: async (): Promise<ProjectRecord[]> => {
      const res = await api.get<ApiResponse<ProjectRecord[]>>('/projects/my');
      return res.data.data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async (): Promise<ProjectRecord> => {
      const res = await api.get<ApiResponse<ProjectRecord>>(`/projects/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useProjectProgress(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'progress'],
    queryFn: async (): Promise<ProjectProgress> => {
      const res = await api.get<ApiResponse<ProjectProgress>>(
        `/projects/${projectId}/progress`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const res = await api.post<ApiResponse<ProjectRecord>>(
        '/projects',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProjectPayload;
    }) => {
      const res = await api.patch<ApiResponse<ProjectRecord>>(
        `/projects/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.id],
      });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeIds,
    }: {
      projectId: string;
      employeeIds: string[];
    }) => {
      const res = await api.post<ApiResponse<ProjectRecord>>(
        `/projects/${projectId}/members`,
        { employeeIds },
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
      });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      employeeId,
    }: {
      projectId: string;
      employeeId: string;
    }) => {
      await api.delete(`/projects/${projectId}/members/${employeeId}`);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId],
      });
    },
  });
}

export function useCompleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: CompleteProjectPayload;
    }) => {
      const res = await api.patch<ApiResponse<ProjectRecord>>(
        `/projects/${projectId}/complete`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await api.patch<ApiResponse<ProjectRecord>>(
        `/projects/${projectId}/archive`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ─── Milestones ────────────────────────────────────────────────

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'milestones'],
    queryFn: async (): Promise<MilestoneRecord[]> => {
      const res = await api.get<ApiResponse<MilestoneRecord[]>>(
        `/projects/${projectId}/milestones`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: CreateMilestonePayload;
    }) => {
      const res = await api.post<ApiResponse<MilestoneRecord>>(
        `/projects/${projectId}/milestones`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'milestones'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      payload,
    }: {
      projectId: string;
      milestoneId: string;
      payload: UpdateMilestonePayload;
    }) => {
      const res = await api.patch<ApiResponse<MilestoneRecord>>(
        `/projects/${projectId}/milestones/${milestoneId}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'milestones'],
      });
    },
  });
}

export function useCompleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
    }: {
      projectId: string;
      milestoneId: string;
    }) => {
      const res = await api.patch<ApiResponse<MilestoneRecord>>(
        `/projects/${projectId}/milestones/${milestoneId}/complete`,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'milestones'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useApproveMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
    }: {
      projectId: string;
      milestoneId: string;
    }) => {
      const res = await api.patch<ApiResponse<MilestoneRecord>>(
        `/projects/${projectId}/milestones/${milestoneId}/approve`,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'milestones'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ─── Tasks ─────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  milestoneId?: string;
  priority?: string;
}

function taskFiltersToParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.milestoneId) params.set('milestoneId', filters.milestoneId);
  if (filters.priority) params.set('priority', filters.priority);
  return params;
}

export function useProjectTasks(projectId: string, filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['projects', projectId, 'tasks', filters],
    queryFn: async (): Promise<TaskRecord[]> => {
      const params = taskFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<ApiResponse<TaskRecord[]>>(
        `/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useTask(projectId: string, taskId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'tasks', taskId],
    queryFn: async (): Promise<TaskRecord> => {
      const res = await api.get<ApiResponse<TaskRecord>>(
        `/projects/${projectId}/tasks/${taskId}`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId) && Boolean(taskId),
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['projects', 'tasks', 'my'],
    queryFn: async (): Promise<MyTasksResponse> => {
      const res = await api.get<ApiResponse<MyTasksResponse>>(
        '/projects/tasks/my',
      );
      return res.data.data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: CreateTaskPayload;
    }) => {
      const res = await api.post<ApiResponse<TaskRecord>>(
        `/projects/${projectId}/tasks`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'progress'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'tasks', 'my'],
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      payload,
    }: {
      projectId: string;
      taskId: string;
      payload: UpdateTaskPayload;
    }) => {
      const res = await api.patch<ApiResponse<TaskRecord>>(
        `/projects/${projectId}/tasks/${taskId}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks', variables.taskId],
      });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      payload,
    }: {
      projectId: string;
      taskId: string;
      payload: UpdateTaskStatusPayload;
    }) => {
      const res = await api.patch<ApiResponse<TaskRecord>>(
        `/projects/${projectId}/tasks/${taskId}/status`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks', variables.taskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'progress'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'tasks', 'my'],
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
    }: {
      projectId: string;
      taskId: string;
    }) => {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'progress'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddTaskComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      payload,
    }: {
      projectId: string;
      taskId: string;
      payload: CreateTaskCommentPayload;
    }) => {
      const res = await api.post<ApiResponse<TaskCommentRecord>>(
        `/projects/${projectId}/tasks/${taskId}/comments`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks', variables.taskId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
    },
  });
}

export function useProjectApprovals(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'approvals'],
    queryFn: async (): Promise<DeliverableApprovalRecord[]> => {
      const res = await api.get<ApiResponse<DeliverableApprovalRecord[]>>(
        `/projects/${projectId}/approvals`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useRequestApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      payload,
    }: {
      projectId: string;
      taskId: string;
      payload: RequestApprovalPayload;
    }) => {
      const res = await api.post<ApiResponse<DeliverableApprovalRecord>>(
        `/projects/${projectId}/tasks/${taskId}/approvals`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'approvals'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'activity'],
      });
    },
  });
}

export function useRecordApprovalDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      approvalId,
      payload,
    }: {
      projectId: string;
      approvalId: string;
      payload: RecordApprovalPayload;
    }) => {
      const res = await api.patch<ApiResponse<DeliverableApprovalRecord>>(
        `/projects/${projectId}/approvals/${approvalId}/decision`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'approvals'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'progress'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'activity'],
      });
    },
  });
}

export function useProjectActivity(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'activity'],
    queryFn: async (): Promise<ProjectActivityRecord[]> => {
      const res = await api.get<ApiResponse<ProjectActivityRecord[]>>(
        `/projects/${projectId}/activity`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useTeamWorkload() {
  return useQuery({
    queryKey: ['projects', 'workload'],
    queryFn: async (): Promise<TeamWorkloadResponse> => {
      const res = await api.get<ApiResponse<TeamWorkloadResponse>>(
        '/projects/workload',
      );
      return res.data.data;
    },
  });
}

export function useProjectStatusReport(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'status-report'],
    queryFn: async (): Promise<ProjectStatusReport> => {
      const res = await api.get<ApiResponse<ProjectStatusReport>>(
        `/projects/${projectId}/status-report`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function usePortfolioReport(filters: PortfolioReportFilters = {}) {
  return useQuery({
    queryKey: ['projects', 'reports', 'portfolio', filters],
    queryFn: async (): Promise<PortfolioReport> => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.serviceType) params.set('serviceType', filters.serviceType);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<PortfolioReport>>(
        `/projects/reports/portfolio${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}


export function useHandoverReport(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'handover'],
    queryFn: async (): Promise<HandoverReport> => {
      const res = await api.get<ApiResponse<HandoverReport>>(
        `/projects/${projectId}/handover-report`,
      );
      return res.data.data;
    },
    enabled: Boolean(projectId),
    retry: false,
  });
}

export function useGenerateHandoverReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await api.post<ApiResponse<HandoverReport>>(
        `/projects/${projectId}/handover-report`,
      );
      return res.data.data;
    },
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'handover'],
      });
    },
  });
}

export function useImportTasksCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      file,
    }: {
      projectId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('tasks', file);
      const res = await api.post<ApiResponse<TaskImportResult>>(
        `/projects/${projectId}/tasks/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'tasks'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'progress'],
      });
    },
  });
}
