'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { LeadRecord } from '@cdy/shared';
import { formatCurrency } from '@/lib/utils';
import {
  getScoreBand,
  scoreBandBorder,
} from '@/lib/leadScoring';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: LeadRecord & {
    activities?: Array<{ summary: string; performedAt: string }>;
  };
  draggable?: boolean;
  onDragStart?: () => void;
}

export function LeadCard({ lead, draggable, onDragStart }: LeadCardProps): JSX.Element {
  const score = lead.qualityScore ?? 0;
  const band = getScoreBand(score);
  const latestActivity = lead.activities?.[0];

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        'cursor-grab rounded-lg border border-cdy-navy-border border-l-4 bg-cdy-navy-light p-4 shadow-sm active:cursor-grabbing',
        scoreBandBorder(band),
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-cdy-muted">
          {band === 'hot' ? '🔥' : band === 'warm' ? '🌡' : '❄'} Score: {score}
        </span>
        {lead.estimatedValue != null && (
          <span className="text-xs font-semibold text-cdy-white">
            {formatCurrency(Number(lead.estimatedValue), lead.currency)}
          </span>
        )}
      </div>
      <Link href={`/crm/leads/${lead.id}`} className="block font-medium text-cdy-white hover:text-cdy-red">
        {lead.companyName}
      </Link>
      <p className="text-sm text-cdy-muted">
        {lead.contactName} · {lead.email}
      </p>
      <p className="mt-1 text-xs text-cdy-muted">
        {lead.serviceInterest.replace('_', ' ')} · {lead.source.replace('_', ' ')}
      </p>
      {latestActivity && (
        <p className="mt-3 border-t border-cdy-navy-border pt-2 text-xs text-cdy-muted">
          {latestActivity.summary} —{' '}
          {formatDistanceToNow(new Date(latestActivity.performedAt), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
