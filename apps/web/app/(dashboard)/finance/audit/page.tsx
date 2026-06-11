'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import type { FinanceAuditLogRecord } from '@cdy/shared';
import { cn } from '@/lib/utils';

function actionColor(action: string): string {
  if (action.endsWith('.created')) return 'text-blue-400';
  if (action.endsWith('.updated')) return 'text-amber-400';
  if (action.endsWith('.sent') || action.endsWith('.approved')) return 'text-green-400';
  if (
    action.endsWith('.deleted') ||
    action.endsWith('.rejected') ||
    action.endsWith('.written_off')
  ) {
    return 'text-cdy-red';
  }
  if (action.endsWith('.self_edit_blocked')) return 'text-orange-400';
  return 'text-cdy-muted';
}

function DiffPopover({
  log,
  open,
  onClose,
}: {
  log: FinanceAuditLogRecord;
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} role="presentation" />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-cdy-white">Change diff</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-cdy-muted">Before</p>
            <pre className="overflow-auto rounded bg-cdy-navy p-3 text-xs text-red-300">
              {JSON.stringify(log.previousValue ?? {}, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-cdy-muted">After</p>
            <pre className="overflow-auto rounded bg-cdy-navy p-3 text-xs text-green-300">
              {JSON.stringify(log.newValue ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuditLogPage(): JSX.Element {
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [diffLog, setDiffLog] = useState<FinanceAuditLogRecord | null>(null);

  const { data, isLoading, isError } = useAuditLog({
    userId: userId || undefined,
    action: action || undefined,
    entityType: entityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-cdy-muted">
          <Link href="/finance" className="hover:text-cdy-white">
            Finance
          </Link>{' '}
          / Audit Log
        </p>
        <h1 className="text-2xl font-semibold text-cdy-white">Audit Log</h1>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        This log is read-only. Entries cannot be edited or deleted.
      </div>

      <div className="grid gap-3 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 md:grid-cols-5">
        <Input
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Input
          placeholder="Action (e.g. invoice.sent)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <Input
          placeholder="Entity type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      {isLoading && <InvoiceTableSkeleton />}
      {isError && (
        <p className="text-cdy-muted">Failed to load audit log.</p>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-cdy-navy text-xs uppercase text-cdy-muted">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cdy-navy-border bg-cdy-navy-light">
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs text-cdy-muted">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-cdy-white">{log.userEmail}</p>
                    </td>
                    <td className={cn('px-4 py-3 font-mono text-xs', actionColor(log.action))}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {log.entityType} —{' '}
                      <span className="font-mono text-xs text-cdy-muted">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-cdy-muted">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(log.previousValue || log.newValue) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDiffLog(log)}
                        >
                          View diff
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-cdy-muted">
              Page {data.page} of {data.totalPages} ({data.total} entries)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {diffLog && (
        <DiffPopover
          log={diffLog}
          open={!!diffLog}
          onClose={() => setDiffLog(null)}
        />
      )}
    </div>
  );
}
