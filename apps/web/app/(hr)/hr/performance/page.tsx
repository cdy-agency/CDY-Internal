'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { ReviewStatus, EmployeeStatus } from '@cdy/shared';
import type { PerformanceReviewRecord } from '@cdy/shared';
import {
  usePendingPerformanceReviews,
  usePerformanceReviews,
  useEmployees,
  useCreatePerformanceReview,
  useMyEmployeeProfile,
} from '@/hooks/useHr';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
type Quarter = (typeof QUARTERS)[number];

function statusColor(status: ReviewStatus): string {
  const map: Record<ReviewStatus, string> = {
    [ReviewStatus.DRAFT]: 'bg-cdy-muted/20 text-cdy-muted',
    [ReviewStatus.SELF_ASSESSMENT]: 'bg-blue-500/20 text-blue-400',
    [ReviewStatus.MANAGER_REVIEW]: 'bg-amber-500/20 text-amber-400',
    [ReviewStatus.ACKNOWLEDGED]: 'bg-purple-500/20 text-purple-400',
    [ReviewStatus.COMPLETED]: 'bg-emerald-500/20 text-emerald-400',
  };
  return map[status];
}

function cellColor(status: ReviewStatus): string {
  const map: Record<ReviewStatus, string> = {
    [ReviewStatus.DRAFT]: 'bg-cdy-muted/40 hover:bg-cdy-muted/60',
    [ReviewStatus.SELF_ASSESSMENT]: 'bg-blue-500/50 hover:bg-blue-500/70',
    [ReviewStatus.MANAGER_REVIEW]: 'bg-amber-500/50 hover:bg-amber-500/70',
    [ReviewStatus.ACKNOWLEDGED]: 'bg-purple-500/50 hover:bg-purple-500/70',
    [ReviewStatus.COMPLETED]: 'bg-emerald-500/50 hover:bg-emerald-500/70',
  };
  return map[status];
}

function formatPeriod(year: number, quarter: Quarter): string {
  return `${quarter}-${year}`;
}

export default function PerformanceReviewsPage(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const { data: pending, isLoading: pendingLoading } =
    usePendingPerformanceReviews();
  const { data: allReviews, isLoading: reviewsLoading } =
    usePerformanceReviews();
  const { data: employees, isLoading: employeesLoading } = useEmployees({
    status: EmployeeStatus.ACTIVE,
  });
  const { data: myProfile } = useMyEmployeeProfile();
  const createReview = useCreatePerformanceReview();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PerformanceReviewRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    quarter: 'Q1' as Quarter,
    year: String(currentYear),
    reviewDate: format(new Date(), 'yyyy-MM-dd'),
    goals: '',
    nextReviewDate: '',
  });

  const reviewGrid = useMemo(() => {
    const map = new Map<string, Map<string, { id: string; status: ReviewStatus }>>();
    for (const review of allReviews ?? []) {
      if (!review.period.endsWith(String(currentYear))) continue;
      if (!map.has(review.employeeId)) {
        map.set(review.employeeId, new Map());
      }
      map.get(review.employeeId)!.set(review.period, {
        id: review.id,
        status: review.status,
      });
    }
    return map;
  }, [allReviews, currentYear]);

  async function handleCreate(): Promise<void> {
    if (!form.employeeId || !myProfile?.id) {
      toast.error('Please select an employee');
      return;
    }
    const period = formatPeriod(Number(form.year), form.quarter);
    const goalsSet = form.goals
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    try {
      await createReview.mutateAsync({
        employeeId: form.employeeId,
        reviewerId: myProfile.id,
        period,
        reviewDate: form.reviewDate,
        goalsSet: goalsSet.length > 0 ? goalsSet : undefined,
        nextReviewDate: form.nextReviewDate || undefined,
      });
      toast.success('Performance review started');
      setModalOpen(false);
      setForm({
        employeeId: '',
        quarter: 'Q1',
        year: String(currentYear),
        reviewDate: format(new Date(), 'yyyy-MM-dd'),
        goals: '',
        nextReviewDate: '',
      });
    } catch {
      /* interceptor */
    }
  }

  async function handleDeleteReview(): Promise<void> {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/hr/performance/${deleteTarget.id}`);
      toast.success('Performance review deleted');
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      setDeleteTarget(null);
    } catch {
      /* interceptor already toasts */
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-cdy-white">
          Performance Reviews
        </h2>
        <PermissionGate feature="hr.performance" action="write">
          <Button onClick={() => setModalOpen(true)}>Start Review</Button>
        </PermissionGate>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">Pending Reviews</h3>
        {pendingLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (pending?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No pending reviews.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="pb-2 pr-4 font-medium">Employee</th>
                  <th className="pb-2 pr-4 font-medium">Period</th>
                  <th className="pb-2 pr-4 font-medium">Review Date</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending?.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="py-2 pr-4 text-cdy-white">
                      {review.employee
                        ? `${review.employee.firstName} ${review.employee.lastName}`
                        : '—'}
                    </td>
                    <td className="py-2 pr-4 text-cdy-muted">{review.period}</td>
                    <td className="py-2 pr-4 text-cdy-muted">
                      {format(new Date(review.reviewDate), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          statusColor(review.status),
                        )}
                      >
                        {review.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/hr/performance/${review.id}`}>
                          <Button size="sm" variant="outline">
                            {review.status === ReviewStatus.MANAGER_REVIEW
                              ? 'Complete'
                              : 'View'}
                          </Button>
                        </Link>
                        <PermissionGate feature="hr.performance" action="write">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(review)}
                            className="text-cdy-muted hover:text-cdy-red"
                            aria-label="Delete performance review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">
          Team Review Status — {currentYear}
        </h3>
        {employeesLoading || reviewsLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : (employees?.length ?? 0) === 0 ? (
          <p className="text-sm text-cdy-muted">No active employees.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="sticky left-0 bg-cdy-navy-light pb-2 pr-4 font-medium">
                    Employee
                  </th>
                  {QUARTERS.map((q) => (
                    <th key={q} className="pb-2 pr-4 text-center font-medium">
                      {q}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees?.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="sticky left-0 bg-cdy-navy-light py-2 pr-4 text-cdy-white">
                      {emp.firstName} {emp.lastName}
                    </td>
                    {QUARTERS.map((q) => {
                      const period = formatPeriod(currentYear, q);
                      const cell = reviewGrid.get(emp.id)?.get(period);
                      return (
                        <td key={q} className="py-2 pr-4 text-center">
                          {cell ? (
                            <Link
                              href={`/hr/performance/${cell.id}`}
                              className={cn(
                                'mx-auto inline-block h-8 w-8 rounded-md transition-colors',
                                cellColor(cell.status),
                              )}
                              title={cell.status.replace('_', ' ')}
                            />
                          ) : (
                            <div className="mx-auto h-8 w-8 rounded-md bg-cdy-navy" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-cdy-muted">
          {Object.values(ReviewStatus).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className={cn('h-3 w-3 rounded-sm', statusColor(status))}
              />
              {status.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setModalOpen(false)}
            role="presentation"
          />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-cdy-white">Start Review</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-cdy-muted hover:text-cdy-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="employeeId">Employee *</Label>
                <select
                  id="employeeId"
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employeeId: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="">Select employee…</option>
                  {employees?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quarter">Period *</Label>
                  <select
                    id="quarter"
                    value={form.quarter}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quarter: e.target.value as Quarter,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                  >
                    {QUARTERS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min={2020}
                    max={2100}
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, year: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reviewDate">Review date *</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={form.reviewDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reviewDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="goals">Goals</Label>
                <textarea
                  id="goals"
                  rows={4}
                  value={form.goals}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, goals: e.target.value }))
                  }
                  placeholder="One goal per line"
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                />
              </div>
              <div>
                <Label htmlFor="nextReviewDate">Next review date</Label>
                <Input
                  id="nextReviewDate"
                  type="date"
                  value={form.nextReviewDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nextReviewDate: e.target.value }))
                  }
                />
              </div>
              <Button
                className="w-full"
                disabled={createReview.isPending || !form.employeeId}
                onClick={() => void handleCreate()}
              >
                {createReview.isPending ? 'Creating…' : 'Start Review'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete performance review?"
        description={
          deleteTarget
            ? `This will remove the ${deleteTarget.period} review${
                deleteTarget.employee
                  ? ` for ${deleteTarget.employee.firstName} ${deleteTarget.employee.lastName}`
                  : ''
              }.`
            : undefined
        }
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDeleteReview()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
