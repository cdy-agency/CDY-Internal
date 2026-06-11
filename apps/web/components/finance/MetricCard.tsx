'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
  icon: LucideIcon;
  iconColor: string;
  isLoading: boolean;
  subLabel?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor,
  isLoading,
  subLabel,
}: MetricCardProps): JSX.Element {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
        <Skeleton className="mb-4 h-10 w-10 rounded-md" />
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-3 h-8 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const isPositive = delta >= 0;
  const DeltaIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-md',
          iconColor,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mb-1 text-sm text-cdy-muted">{label}</p>
      <p className="mb-2 text-2xl font-medium text-cdy-white">{value}</p>
      {subLabel && (
        <p className="mb-2 text-sm text-cdy-muted">{subLabel} pending value</p>
      )}
      <div
        className={cn(
          'flex items-center gap-1 text-sm',
          isPositive ? 'text-[var(--cdy-success)]' : 'text-[var(--cdy-danger)]',
        )}
      >
        <DeltaIcon className="h-3.5 w-3.5" />
        <span>
          {Math.abs(delta)}% {deltaLabel}
        </span>
      </div>
    </div>
  );
}
