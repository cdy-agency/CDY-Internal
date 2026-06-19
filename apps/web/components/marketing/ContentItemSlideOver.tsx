'use client';

import { X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useUpdateContentStatus } from '@/hooks/useMarketing';
import { STATUS_CONFIG, ALLOWED_TRANSITIONS, STATUS_ACTION_LABELS } from '@/lib/marketingUtils';
import type { ContentItemRecord } from '@cdy/shared';
import { ContentStatus } from '@cdy/shared';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

interface ContentItemSlideOverProps {
  item: ContentItemRecord;
  clientId: string;
  onClose: () => void;
}

export function ContentItemSlideOver({
  item,
  clientId,
  onClose,
}: ContentItemSlideOverProps): JSX.Element {
  const { mutateAsync, isPending } = useUpdateContentStatus(clientId);

  const statusCfg = STATUS_CONFIG[item.status];
  const nextStatuses = ALLOWED_TRANSITIONS[item.status];

  async function handleStatusChange(status: ContentStatus): Promise<void> {
    try {
      await mutateAsync({ itemId: item.id, status });
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to update status');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-cdy-muted">
              {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)} ·{' '}
              {item.contentType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <h2 className="text-lg font-semibold text-cdy-white">{item.title}</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-cdy-muted">Scheduled</p>
              <p className="text-cdy-white">
                {format(new Date(item.scheduledDate), 'MMM d, yyyy')}
              </p>
            </div>
            {item.publishedAt && (
              <div>
                <p className="text-xs text-cdy-muted">Published</p>
                <p className="text-green-400">
                  {format(new Date(item.publishedAt), 'MMM d, yyyy')} ✓
                </p>
              </div>
            )}
            {item.approvedAt && (
              <div>
                <p className="text-xs text-cdy-muted">Approved</p>
                <p className="text-cdy-white">
                  {format(new Date(item.approvedAt), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {item.description && (
            <div>
              <p className="mb-1.5 text-xs text-cdy-muted">Caption / Copy</p>
              <p className="rounded-md border border-cdy-navy-border bg-cdy-navy p-3 text-sm text-cdy-white whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}

          {item.fileUrl && (
            <div>
              <p className="mb-1.5 text-xs text-cdy-muted">File</p>
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-cdy-red hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View design file
              </a>
            </div>
          )}

          {item.notes && (
            <div>
              <p className="mb-1.5 text-xs text-cdy-muted">Notes</p>
              <p className="text-sm text-cdy-white">{item.notes}</p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs text-cdy-muted">Status</p>
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
          </div>

          {nextStatuses.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-cdy-muted">Update status</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => void handleStatusChange(s)}
                  >
                    {STATUS_ACTION_LABELS[s] ?? STATUS_CONFIG[s].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
