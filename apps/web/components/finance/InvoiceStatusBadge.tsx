import { InvoiceStatus } from '@cdy/shared';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<
  InvoiceStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  [InvoiceStatus.DRAFT]: {
    bg: '#1E2A3A',
    text: '#94A3B8',
    border: '#1E3A5F',
    label: 'Draft',
  },
  [InvoiceStatus.SENT]: {
    bg: '#1E3A5F',
    text: '#3B82F6',
    border: '#2D4E7A',
    label: 'Sent',
  },
  [InvoiceStatus.PARTIALLY_PAID]: {
    bg: '#2D1A00',
    text: '#F59E0B',
    border: '#4A2E00',
    label: 'Partial',
  },
  [InvoiceStatus.PAID]: {
    bg: '#0D2A1A',
    text: '#10B981',
    border: '#1A4A2E',
    label: 'Paid',
  },
  [InvoiceStatus.OVERDUE]: {
    bg: '#2D0A10',
    text: '#EF4444',
    border: '#4A1520',
    label: 'Overdue',
  },
  [InvoiceStatus.WRITTEN_OFF]: {
    bg: '#1A1A2E',
    text: '#6366F1',
    border: '#2D2D4A',
    label: 'Written Off',
  },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps): JSX.Element {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
}
