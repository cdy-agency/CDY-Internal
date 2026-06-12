'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ReviewStatus } from '@cdy/shared';
import { useMyPerformanceReviews } from '@/hooks/useHr';
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

function ratingBarColor(rating: number): string {
  if (rating >= 4) return 'bg-emerald-500';
  if (rating >= 3) return 'bg-amber-500';
  return 'bg-cdy-red';
}

export default function MyPerformanceReviewsPage(): JSX.Element {
  const { data: reviews, isLoading } = useMyPerformanceReviews();

  const sorted = [...(reviews ?? [])].sort(
    (a, b) =>
      new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime(),
  );

  const ratedReviews = sorted.filter(
    (r) => r.overallRating != null || r.selfRating != null,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-cdy-white">My Reviews</h2>

      {ratedReviews.length > 0 && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h3 className="mb-4 font-semibold text-cdy-white">Rating Trend</h3>
          <div className="space-y-3">
            {ratedReviews.map((review) => {
              const rating =
                review.overallRating ?? review.selfRating ?? 0;
              return (
                <div key={review.id} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-cdy-muted">
                    {review.period}
                  </span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-md bg-cdy-navy">
                      <div
                        className={cn(
                          'flex h-full items-center justify-end rounded-md px-2 text-xs font-medium text-white transition-all',
                          ratingBarColor(rating),
                        )}
                        style={{ width: `${(rating / 5) * 100}%` }}
                      >
                        {rating}/5
                      </div>
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-cdy-muted">
                    {review.overallRating != null ? 'Manager' : 'Self'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <h3 className="mb-4 font-semibold text-cdy-white">Review Timeline</h3>
        {isLoading ? (
          <p className="text-sm text-cdy-muted">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-cdy-muted">No performance reviews yet.</p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute bottom-0 left-3 top-0 w-px bg-cdy-navy-border" />
            {sorted.map((review) => (
              <div key={review.id} className="relative flex gap-4 pb-6 pl-8">
                <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-cdy-red bg-cdy-navy-light" />
                <div className="flex-1 rounded-md border border-cdy-navy-border bg-cdy-navy p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/hr/performance/${review.id}`}
                        className="font-medium text-cdy-white hover:text-cdy-red"
                      >
                        {review.period}
                      </Link>
                      <p className="mt-0.5 text-xs text-cdy-muted">
                        {format(new Date(review.reviewDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        statusColor(review.status),
                      )}
                    >
                      {review.status.replace('_', ' ')}
                    </span>
                  </div>
                  {review.overallRating != null && (
                    <p className="mt-2 text-sm text-cdy-muted">
                      Overall rating:{' '}
                      <span className="text-cdy-white">
                        {review.overallRating}/5
                      </span>
                    </p>
                  )}
                  {(review.status === ReviewStatus.DRAFT ||
                    review.status === ReviewStatus.SELF_ASSESSMENT ||
                    review.status === ReviewStatus.ACKNOWLEDGED) && (
                    <Link
                      href={`/hr/performance/${review.id}`}
                      className="mt-2 inline-block text-sm text-cdy-red hover:underline"
                    >
                      {review.status === ReviewStatus.ACKNOWLEDGED
                        ? 'Acknowledge review →'
                        : 'Complete self-assessment →'}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
