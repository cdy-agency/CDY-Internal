'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { ReviewStatus } from '@cdy/shared';
import {
  usePerformanceReview,
  useMyEmployeeProfile,
  useSubmitSelfAssessment,
  useCompletePerformanceReview,
  useAcknowledgePerformanceReview,
} from '@/hooks/useHr';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

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

function RatingSelect({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  id: string;
}): JSX.Element {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n} — {n === 1 ? 'Needs improvement' : n === 5 ? 'Outstanding' : ''}
        </option>
      ))}
    </select>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}): JSX.Element | null {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt className="text-cdy-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-cdy-white">{value}</dd>
    </div>
  );
}

export default function PerformanceReviewDetailPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { data: review, isLoading } = usePerformanceReview(id);
  const { data: myProfile } = useMyEmployeeProfile();
  const submitSelf = useSubmitSelfAssessment();
  const completeReview = useCompletePerformanceReview();
  const acknowledge = useAcknowledgePerformanceReview();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selfForm, setSelfForm] = useState({
    selfAssessment: '',
    selfRating: 3,
  });
  const [managerForm, setManagerForm] = useState({
    managerNotes: '',
    overallRating: 3,
    strengths: '',
    improvements: '',
    nextReviewDate: '',
  });

  const isEmployee = myProfile?.id === review?.employeeId;
  const isReviewer = myProfile?.id === review?.reviewerId;

  if (isLoading) {
    return <p className="text-sm text-cdy-muted">Loading…</p>;
  }

  if (!review) {
    return <p className="text-sm text-cdy-muted">Performance review not found.</p>;
  }

  const currentReview = review;

  const showSelfForm =
    isEmployee &&
    (currentReview.status === ReviewStatus.DRAFT ||
      currentReview.status === ReviewStatus.SELF_ASSESSMENT);

  const showManagerForm =
    isReviewer && currentReview.status === ReviewStatus.MANAGER_REVIEW;

  const showAcknowledge =
    isEmployee && currentReview.status === ReviewStatus.ACKNOWLEDGED;

  const isReadOnly =
    currentReview.status === ReviewStatus.COMPLETED ||
    (!showSelfForm && !showManagerForm && !showAcknowledge);

  async function handleSelfSubmit(): Promise<void> {
    const assessment =
      selfForm.selfAssessment.trim() || currentReview.selfAssessment?.trim() || '';
    if (!assessment) {
      toast.error('Please enter your self-assessment');
      return;
    }
    if (assessment.length > 2000) {
      toast.error('Self-assessment must be 2000 characters or less');
      return;
    }
    try {
      await submitSelf.mutateAsync({
        id,
        selfAssessment: assessment,
        selfRating: selfForm.selfRating,
      });
      toast.success('Self-assessment submitted');
    } catch {
      /* interceptor */
    }
  }

  async function handleManagerComplete(): Promise<void> {
    if (!managerForm.managerNotes.trim()) {
      toast.error('Please enter manager notes');
      return;
    }
    try {
      await completeReview.mutateAsync({
        id,
        payload: {
          managerNotes: managerForm.managerNotes,
          overallRating: managerForm.overallRating,
          strengths: managerForm.strengths || undefined,
          improvements: managerForm.improvements || undefined,
          nextReviewDate: managerForm.nextReviewDate || undefined,
        },
      });
      toast.success('Review completed');
    } catch {
      /* interceptor */
    }
  }

  async function handleAcknowledge(): Promise<void> {
    try {
      await acknowledge.mutateAsync(id);
      toast.success('Review acknowledged');
    } catch {
      /* interceptor */
    }
  }

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await api.delete(`/hr/performance/${id}`);
      toast.success('Performance review deleted');
      void queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      router.push(isEmployee ? '/hr/performance/my' : '/hr/performance');
    } catch {
      /* interceptor already toasts */
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cdy-white">
          Performance Review — {review.period}
        </h2>
        <div className="flex items-center gap-3">
          <PermissionGate feature="hr.performance" action="write">
            <Button
              size="sm"
              variant="outline"
              className="text-cdy-red hover:text-cdy-red"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>
          <Link
            href={isEmployee ? '/hr/performance/my' : '/hr/performance'}
            className="text-sm text-cdy-muted hover:text-cdy-white"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium',
              statusColor(review.status),
            )}
          >
            {review.status.replace('_', ' ')}
          </span>
          <span className="text-sm text-cdy-muted">
            {format(new Date(review.reviewDate), 'MMM d, yyyy')}
          </span>
        </div>

        <dl className="space-y-4 text-sm">
          {review.employee && (
            <div>
              <dt className="text-cdy-muted">Employee</dt>
              <dd className="mt-1 text-cdy-white">
                {review.employee.firstName} {review.employee.lastName}
                <span className="ml-2 text-cdy-muted">
                  · {review.employee.jobTitle}
                </span>
              </dd>
            </div>
          )}
          <ReadOnlyField label="Period" value={review.period} />
          {review.acknowledgedAt && (
            <div>
              <dt className="text-cdy-muted">Acknowledged</dt>
              <dd className="mt-1 text-cdy-white">
                {format(new Date(review.acknowledgedAt), 'MMM d, yyyy HH:mm')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {showSelfForm && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
          <h3 className="mb-4 font-semibold text-cdy-white">Self-Assessment</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="selfAssessment">Your assessment *</Label>
              <textarea
                id="selfAssessment"
                rows={6}
                maxLength={2000}
                value={selfForm.selfAssessment || review.selfAssessment || ''}
                onChange={(e) =>
                  setSelfForm((f) => ({
                    ...f,
                    selfAssessment: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
              <p className="mt-1 text-xs text-cdy-muted">
                {(selfForm.selfAssessment || review.selfAssessment || '').length}
                /2000
              </p>
            </div>
            <div>
              <Label htmlFor="selfRating">Self rating (1–5) *</Label>
              <RatingSelect
                id="selfRating"
                value={selfForm.selfRating}
                onChange={(v) => setSelfForm((f) => ({ ...f, selfRating: v }))}
              />
            </div>
            <Button
              disabled={submitSelf.isPending}
              onClick={() => void handleSelfSubmit()}
            >
              {submitSelf.isPending ? 'Submitting…' : 'Submit Self-Assessment'}
            </Button>
          </div>
        </div>
      )}

      {showManagerForm && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
          <h3 className="mb-4 font-semibold text-cdy-white">Manager Review</h3>
          {review.selfAssessment && (
            <div className="mb-4 rounded-md border border-cdy-navy-border bg-cdy-navy p-4 text-sm">
              <p className="mb-1 text-xs font-medium text-cdy-muted">
                Employee self-assessment
                {review.selfRating != null && ` · Rating: ${review.selfRating}/5`}
              </p>
              <p className="whitespace-pre-wrap text-cdy-white">
                {review.selfAssessment}
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="managerNotes">Manager notes *</Label>
              <textarea
                id="managerNotes"
                rows={4}
                maxLength={2000}
                value={managerForm.managerNotes}
                onChange={(e) =>
                  setManagerForm((f) => ({
                    ...f,
                    managerNotes: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="overallRating">Overall rating (1–5) *</Label>
              <RatingSelect
                id="overallRating"
                value={managerForm.overallRating}
                onChange={(v) =>
                  setManagerForm((f) => ({ ...f, overallRating: v }))
                }
              />
            </div>
            <div>
              <Label htmlFor="strengths">Strengths</Label>
              <textarea
                id="strengths"
                rows={2}
                maxLength={1000}
                value={managerForm.strengths}
                onChange={(e) =>
                  setManagerForm((f) => ({ ...f, strengths: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="improvements">Areas for improvement</Label>
              <textarea
                id="improvements"
                rows={2}
                maxLength={1000}
                value={managerForm.improvements}
                onChange={(e) =>
                  setManagerForm((f) => ({
                    ...f,
                    improvements: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="nextReviewDate">Next review date</Label>
              <Input
                id="nextReviewDate"
                type="date"
                value={managerForm.nextReviewDate}
                onChange={(e) =>
                  setManagerForm((f) => ({
                    ...f,
                    nextReviewDate: e.target.value,
                  }))
                }
              />
            </div>
            <Button
              disabled={completeReview.isPending}
              onClick={() => void handleManagerComplete()}
            >
              {completeReview.isPending ? 'Completing…' : 'Complete Review'}
            </Button>
          </div>
        </div>
      )}

      {showAcknowledge && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
          <h3 className="mb-4 font-semibold text-cdy-white">Acknowledge Review</h3>
          <dl className="mb-4 space-y-3 text-sm">
            <ReadOnlyField
              label="Overall rating"
              value={
                review.overallRating != null
                  ? `${review.overallRating}/5`
                  : null
              }
            />
            <ReadOnlyField label="Manager notes" value={review.managerNotes} />
            <ReadOnlyField label="Strengths" value={review.strengths} />
            <ReadOnlyField label="Improvements" value={review.improvements} />
          </dl>
          <Button
            disabled={acknowledge.isPending}
            onClick={() => void handleAcknowledge()}
          >
            {acknowledge.isPending ? 'Acknowledging…' : 'Acknowledge Review'}
          </Button>
        </div>
      )}

      {isReadOnly &&
        (review.status === ReviewStatus.COMPLETED ||
          review.status === ReviewStatus.ACKNOWLEDGED ||
          review.status === ReviewStatus.MANAGER_REVIEW) && (
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
            <h3 className="mb-4 font-semibold text-cdy-white">Review Details</h3>
            <dl className="space-y-4 text-sm">
              <ReadOnlyField label="Self-assessment" value={review.selfAssessment} />
              <ReadOnlyField
                label="Self rating"
                value={
                  review.selfRating != null ? `${review.selfRating}/5` : null
                }
              />
              <ReadOnlyField
                label="Overall rating"
                value={
                  review.overallRating != null
                    ? `${review.overallRating}/5`
                    : null
                }
              />
              <ReadOnlyField label="Manager notes" value={review.managerNotes} />
              <ReadOnlyField label="Strengths" value={review.strengths} />
              <ReadOnlyField label="Improvements" value={review.improvements} />
              {review.nextReviewDate && (
                <div>
                  <dt className="text-cdy-muted">Next review date</dt>
                  <dd className="mt-1 text-cdy-white">
                    {format(new Date(review.nextReviewDate), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete performance review?"
        description={`This will remove the ${review.period} review${
          review.employee
            ? ` for ${review.employee.firstName} ${review.employee.lastName}`
            : ''
        }.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
