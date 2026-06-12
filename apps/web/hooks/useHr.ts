'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';
import type {
  ApiResponse,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceMonthlyReport,
  AvailableUserRecord,
  CreateEmployeePayload,
  CreateLeaveRequestPayload,
  DepartmentRecord,
  EmployeeDirectoryRecord,
  EmployeeRecord,
  HrSettings,
  HrSummary,
  LeaveBalanceRecord,
  LeaveRequestRecord,
  LeaveStatus,
  LeaveTypeRecord,
  MyAttendanceResponse,
  ReviewLeaveRequestPayload,
  UpdateEmployeePayload,
  PerformanceReviewRecord,
  CreatePerformanceReviewPayload,
  EmployeeSalaryData,
  UpdateSalaryPayload,
  OnboardingChecklistRecord,
  OnboardingItemRecord,
  HrAuditLogRecord,
  HrHeadcountReport,
  HrTurnoverReport,
  HrLeaveUtilisationReport,
  HrAttendanceSummaryReport,
  ReviewStatus,
} from '@cdy/shared';

export function currentMonthParam(): string {
  return format(new Date(), 'yyyy-MM');
}

// ─── Summary ───────────────────────────────────────────────────

export function useHrSummary() {
  return useQuery({
    queryKey: ['hr', 'summary'],
    queryFn: async (): Promise<HrSummary> => {
      const res = await api.get<ApiResponse<HrSummary>>('/hr/summary');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

// ─── Employees ─────────────────────────────────────────────────

export interface EmployeeFilters {
  status?: string;
  departmentId?: string;
  search?: string;
}

function employeeFiltersToParams(filters: EmployeeFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.departmentId) params.set('departmentId', filters.departmentId);
  if (filters.search) params.set('search', filters.search);
  return params;
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: ['hr', 'employees', filters],
    queryFn: async (): Promise<(EmployeeRecord | EmployeeDirectoryRecord)[]> => {
      const params = employeeFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<
        ApiResponse<(EmployeeRecord | EmployeeDirectoryRecord)[]>
      >(`/hr/employees${qs ? `?${qs}` : ''}`);
      return res.data.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['hr', 'employees', id],
    queryFn: async (): Promise<EmployeeRecord> => {
      const res = await api.get<ApiResponse<EmployeeRecord>>(
        `/hr/employees/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useMyEmployeeProfile() {
  return useQuery({
    queryKey: ['hr', 'employees', 'me'],
    queryFn: async (): Promise<EmployeeRecord> => {
      const res = await api.get<ApiResponse<EmployeeRecord>>('/hr/employees/me');
      return res.data.data;
    },
  });
}

export function useAvailableUsers() {
  return useQuery({
    queryKey: ['hr', 'employees', 'available-users'],
    queryFn: async (): Promise<AvailableUserRecord[]> => {
      const res = await api.get<ApiResponse<AvailableUserRecord[]>>(
        '/hr/employees/available-users',
      );
      return res.data.data;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const res = await api.post<ApiResponse<EmployeeRecord>>(
        '/hr/employees',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateEmployeePayload;
    }) => {
      const res = await api.patch<ApiResponse<EmployeeRecord>>(
        `/hr/employees/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'employees', variables.id],
      });
    },
  });
}

export function useTerminateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      endDate,
      reason,
    }: {
      id: string;
      endDate?: string;
      reason?: string;
    }) => {
      const res = await api.post<ApiResponse<EmployeeRecord>>(
        `/hr/employees/${id}/terminate`,
        { endDate, reason },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

// ─── Departments ───────────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: ['hr', 'departments'],
    queryFn: async (): Promise<DepartmentRecord[]> => {
      const res = await api.get<ApiResponse<DepartmentRecord[]>>(
        '/hr/departments',
      );
      return res.data.data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      headId?: string;
    }) => {
      const res = await api.post<ApiResponse<DepartmentRecord>>(
        '/hr/departments',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; description?: string; headId?: string };
    }) => {
      const res = await api.patch<ApiResponse<DepartmentRecord>>(
        `/hr/departments/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
    },
  });
}

// ─── Leave ─────────────────────────────────────────────────────

export interface LeaveFilters {
  status?: LeaveStatus;
  employeeId?: string;
}

function leaveFiltersToParams(filters: LeaveFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  return params;
}

export function useLeaveRequests(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['hr', 'leave', filters],
    queryFn: async (): Promise<LeaveRequestRecord[]> => {
      const params = leaveFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<ApiResponse<LeaveRequestRecord[]>>(
        `/hr/leave${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ['hr', 'leave', 'my'],
    queryFn: async (): Promise<LeaveRequestRecord[]> => {
      const res = await api.get<ApiResponse<LeaveRequestRecord[]>>(
        '/hr/leave/my',
      );
      return res.data.data;
    },
  });
}

export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: ['hr', 'leave', id],
    queryFn: async (): Promise<LeaveRequestRecord> => {
      const res = await api.get<ApiResponse<LeaveRequestRecord>>(
        `/hr/leave/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['hr', 'leave-types'],
    queryFn: async (): Promise<LeaveTypeRecord[]> => {
      const res = await api.get<ApiResponse<LeaveTypeRecord[]>>(
        '/hr/leave-types',
      );
      return res.data.data;
    },
  });
}

export function useMyLeaveBalances() {
  return useQuery({
    queryKey: ['hr', 'leave-balances', 'me'],
    queryFn: async (): Promise<LeaveBalanceRecord[]> => {
      const res = await api.get<ApiResponse<LeaveBalanceRecord[]>>(
        '/hr/leave-balances/me',
      );
      return res.data.data;
    },
  });
}

export function useEmployeeLeaveBalances(employeeId: string, year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['hr', 'leave-balances', employeeId, y],
    queryFn: async (): Promise<LeaveBalanceRecord[]> => {
      const res = await api.get<ApiResponse<LeaveBalanceRecord[]>>(
        `/hr/employees/${employeeId}/leave-balances?year=${y}`,
      );
      return res.data.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLeaveRequestPayload) => {
      const res = await api.post<ApiResponse<LeaveRequestRecord>>(
        '/hr/leave',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ReviewLeaveRequestPayload;
    }) => {
      const res = await api.patch<ApiResponse<LeaveRequestRecord>>(
        `/hr/leave/${id}/review`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'leave', variables.id],
      });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<LeaveRequestRecord>>(
        `/hr/leave/${id}/cancel`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      code: string;
      defaultDaysPerYear: number;
      isPaid: boolean;
      requiresApproval: boolean;
      requiresDocument: boolean;
    }) => {
      const res = await api.post<ApiResponse<LeaveTypeRecord>>(
        '/hr/leave-types',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'leave-types'] });
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        name: string;
        defaultDaysPerYear: number;
        isPaid: boolean;
        requiresApproval: boolean;
        requiresDocument: boolean;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<ApiResponse<LeaveTypeRecord>>(
        `/hr/leave-types/${id}`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'leave-types'] });
    },
  });
}

// ─── Attendance ────────────────────────────────────────────────

export interface AttendanceFilters {
  date?: string;
  month?: string;
  employeeId?: string;
}

function attendanceFiltersToParams(filters: AttendanceFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.date) params.set('date', filters.date);
  if (filters.month) params.set('month', filters.month);
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  return params;
}

export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: ['hr', 'attendance', filters],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const params = attendanceFiltersToParams(filters);
      const qs = params.toString();
      const res = await api.get<ApiResponse<AttendanceRecord[]>>(
        `/hr/attendance${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useMyAttendance(month?: string) {
  const monthKey = month ?? currentMonthParam();
  return useQuery({
    queryKey: ['hr', 'attendance', 'me', monthKey],
    queryFn: async (): Promise<MyAttendanceResponse> => {
      const res = await api.get<ApiResponse<MyAttendanceResponse>>(
        `/hr/attendance/me?month=${monthKey}`,
      );
      return res.data.data;
    },
  });
}

export function useAttendanceReport(employeeId: string, month: string) {
  return useQuery({
    queryKey: ['hr', 'attendance', 'report', employeeId, month],
    queryFn: async (): Promise<AttendanceMonthlyReport> => {
      const res = await api.get<ApiResponse<AttendanceMonthlyReport>>(
        `/hr/attendance/report?employeeId=${employeeId}&month=${month}`,
      );
      return res.data.data;
    },
    enabled: Boolean(employeeId) && Boolean(month),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<AttendanceRecord>>(
        '/hr/attendance/check-in',
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<AttendanceRecord>>(
        '/hr/attendance/check-out',
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
    }) => {
      const res = await api.post<ApiResponse<AttendanceRecord>>(
        '/hr/attendance/manual',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    },
  });
}

// ─── Settings ──────────────────────────────────────────────────

export function useHrSettings() {
  return useQuery({
    queryKey: ['hr', 'settings'],
    queryFn: async (): Promise<HrSettings> => {
      const res = await api.get<ApiResponse<HrSettings>>('/hr/settings');
      return res.data.data;
    },
  });
}

export function useUpdateHrSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { key: string; value: string }) => {
      const res = await api.patch<ApiResponse<HrSettings>>(
        '/hr/settings',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'settings'] });
    },
  });
}

/** Count working days between two dates (Mon–Fri), matching backend logic. */
export function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ─── Performance Reviews ───────────────────────────────────────

export function usePerformanceReviews(filters?: {
  employeeId?: string;
  period?: string;
}) {
  return useQuery({
    queryKey: ['hr', 'performance', filters],
    queryFn: async (): Promise<PerformanceReviewRecord[]> => {
      const params = new URLSearchParams();
      if (filters?.employeeId) params.set('employeeId', filters.employeeId);
      if (filters?.period) params.set('period', filters.period);
      const qs = params.toString();
      const res = await api.get<ApiResponse<PerformanceReviewRecord[]>>(
        `/hr/performance${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function usePendingPerformanceReviews() {
  return useQuery({
    queryKey: ['hr', 'performance', 'pending'],
    queryFn: async (): Promise<PerformanceReviewRecord[]> => {
      const res = await api.get<ApiResponse<PerformanceReviewRecord[]>>(
        '/hr/performance/pending',
      );
      return res.data.data;
    },
  });
}

export function useMyPerformanceReviews() {
  return useQuery({
    queryKey: ['hr', 'performance', 'my'],
    queryFn: async (): Promise<PerformanceReviewRecord[]> => {
      const res = await api.get<ApiResponse<PerformanceReviewRecord[]>>(
        '/hr/performance/my',
      );
      return res.data.data;
    },
  });
}

export function usePerformanceReview(id: string) {
  return useQuery({
    queryKey: ['hr', 'performance', id],
    queryFn: async (): Promise<PerformanceReviewRecord> => {
      const res = await api.get<ApiResponse<PerformanceReviewRecord>>(
        `/hr/performance/${id}`,
      );
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useEmployeePerformanceReviews(employeeId: string) {
  return useQuery({
    queryKey: ['hr', 'performance', 'employee', employeeId],
    queryFn: async (): Promise<PerformanceReviewRecord[]> => {
      const res = await api.get<ApiResponse<PerformanceReviewRecord[]>>(
        `/hr/employees/${employeeId}/performance`,
      );
      return res.data.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useCreatePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePerformanceReviewPayload) => {
      const res = await api.post<ApiResponse<PerformanceReviewRecord>>(
        '/hr/performance',
        payload,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
    },
  });
}

export function useSubmitSelfAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      selfAssessment,
      selfRating,
    }: {
      id: string;
      selfAssessment: string;
      selfRating: number;
    }) => {
      const res = await api.patch<ApiResponse<PerformanceReviewRecord>>(
        `/hr/performance/${id}/self-assessment`,
        { selfAssessment, selfRating },
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'performance', variables.id],
      });
    },
  });
}

export function useCompletePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        managerNotes: string;
        overallRating: number;
        strengths?: string;
        improvements?: string;
        nextPeriodGoals?: object[];
        nextReviewDate?: string;
      };
    }) => {
      const res = await api.patch<ApiResponse<PerformanceReviewRecord>>(
        `/hr/performance/${id}/complete`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'performance', variables.id],
      });
    },
  });
}

export function useAcknowledgePerformanceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiResponse<PerformanceReviewRecord>>(
        `/hr/performance/${id}/acknowledge`,
      );
      return res.data.data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance', id] });
    },
  });
}

// ─── Salary ────────────────────────────────────────────────────

export function useEmployeeSalaryHistory(employeeId: string) {
  return useQuery({
    queryKey: ['hr', 'employees', employeeId, 'salary'],
    queryFn: async (): Promise<EmployeeSalaryData> => {
      const res = await api.get<ApiResponse<EmployeeSalaryData>>(
        `/hr/employees/${employeeId}/salary`,
      );
      return res.data.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useUpdateEmployeeSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: UpdateSalaryPayload;
    }) => {
      const res = await api.post<ApiResponse<EmployeeRecord>>(
        `/hr/employees/${employeeId}/salary`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'employees', variables.employeeId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'employees', variables.employeeId, 'salary'],
      });
    },
  });
}

// ─── Onboarding ────────────────────────────────────────────────

export function useEmployeeOnboarding(employeeId: string) {
  return useQuery({
    queryKey: ['hr', 'employees', employeeId, 'onboarding'],
    queryFn: async (): Promise<OnboardingChecklistRecord> => {
      const res = await api.get<ApiResponse<OnboardingChecklistRecord>>(
        `/hr/employees/${employeeId}/onboarding`,
      );
      return res.data.data;
    },
    enabled: Boolean(employeeId),
  });
}

export function useMarkOnboardingItemComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      itemId,
    }: {
      employeeId: string;
      itemId: string;
    }) => {
      const res = await api.patch<ApiResponse<OnboardingItemRecord>>(
        `/hr/employees/${employeeId}/onboarding/items/${itemId}`,
      );
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['hr', 'employees', variables.employeeId, 'onboarding'],
      });
    },
  });
}

// ─── Reports ───────────────────────────────────────────────────

export function useHrHeadcountReport() {
  return useQuery({
    queryKey: ['hr', 'reports', 'headcount'],
    queryFn: async (): Promise<HrHeadcountReport> => {
      const res = await api.get<ApiResponse<HrHeadcountReport>>(
        '/hr/reports/headcount',
      );
      return res.data.data;
    },
  });
}

export function useHrTurnoverReport(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['hr', 'reports', 'turnover', filters],
    queryFn: async (): Promise<HrTurnoverReport> => {
      const params = new URLSearchParams();
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<HrTurnoverReport>>(
        `/hr/reports/turnover${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

export function useHrLeaveUtilisationReport(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['hr', 'reports', 'leave', y],
    queryFn: async (): Promise<HrLeaveUtilisationReport> => {
      const res = await api.get<ApiResponse<HrLeaveUtilisationReport>>(
        `/hr/reports/leave?year=${y}`,
      );
      return res.data.data;
    },
  });
}

export function useHrAttendanceSummaryReport(filters?: {
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['hr', 'reports', 'attendance', filters],
    queryFn: async (): Promise<HrAttendanceSummaryReport> => {
      const params = new URLSearchParams();
      if (filters?.from) params.set('from', filters.from);
      if (filters?.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await api.get<ApiResponse<HrAttendanceSummaryReport>>(
        `/hr/reports/attendance${qs ? `?${qs}` : ''}`,
      );
      return res.data.data;
    },
  });
}

// ─── Audit ─────────────────────────────────────────────────────

export interface HrAuditFilters {
  page?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useHrAuditLog(filters: HrAuditFilters = {}) {
  return useQuery({
    queryKey: ['hr', 'audit', filters],
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
          data: HrAuditLogRecord[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >(`/hr/audit${qs ? `?${qs}` : ''}`);
      return res.data.data;
    },
  });
}
