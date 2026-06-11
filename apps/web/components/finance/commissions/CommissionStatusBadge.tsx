import { CommissionStatus } from '@cdy/shared';

const CONFIG: Record<CommissionStatus, { label: string; className: string }> = {
  [CommissionStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  [CommissionStatus.APPROVED]: {
    label: 'Approved',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  [CommissionStatus.REJECTED]: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-[var(--cdy-danger)] border-red-500/30',
  },
  [CommissionStatus.PAID]: {
    label: 'Paid',
    className: 'bg-cdy-navy-light text-cdy-muted border-cdy-navy-border',
  },
};

interface CommissionStatusBadgeProps {
  status: CommissionStatus;
}

export function CommissionStatusBadge({
  status,
}: CommissionStatusBadgeProps): JSX.Element {
  const c = CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}
