'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useCrmAuditLog } from '@/hooks/useCrm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CrmAuditLogRecord } from '@cdy/shared';
import { cn } from '@/lib/utils';

function actionColor(action: string): string {
  if (action.endsWith('.created') || action.endsWith('.logged')) return 'text-blue-400';
  if (action.endsWith('.updated') || action.endsWith('.stage_moved')) return 'text-amber-400';
  if (action.includes('bulk')) return 'text-purple-400';
  if (action.endsWith('.deleted')) return 'text-cdy-red';
  return 'text-cdy-muted';
}

function formatActionDetails(log: CrmAuditLogRecord): string {
  if (log.action === 'lead.stage_moved' && log.newValue) {
    const nv = log.newValue as { stage?: string; fromStage?: string };
    return nv.fromStage
      ? `${nv.fromStage} → ${nv.stage ?? ''}`
      : String(nv.stage ?? '');
  }
  if (log.action === 'proposal.status_updated' && log.previousValue && log.newValue) {
    const prev = log.previousValue as { status?: string };
    const next = log.newValue as { status?: string };
    return `${prev.status ?? ''} → ${next.status ?? ''}`;
  }
  if (log.action === 'lead.created' && log.newValue) {
    const nv = log.newValue as { companyName?: string };
    return nv.companyName ? `New lead — ${nv.companyName}` : 'New lead';
  }
  return log.entityType;
}

function DiffModal({
  log,
  onClose,
}: {
  log: CrmAuditLogRecord;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} role="presentation" />
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

export default function CrmAuditPage(): JSX.Element {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [diffLog, setDiffLog] = useState<CrmAuditLogRecord | null>(null);

  const { data, isLoading, isError } = useCrmAuditLog({
    page,
    action: action || undefined,
    entityType: entityType || undefined,
    userId: userId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">CRM</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Audit Log</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">CRM Audit Log</h1>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        This log is read-only. Entries cannot be edited or deleted.
      </div>

      <div className="grid gap-3 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 md:grid-cols-5">
        <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Input placeholder="Action" value={action} onChange={(e) => setAction(e.target.value)} />
        <Input
          placeholder="Entity type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {isLoading && <p className="text-cdy-muted">Loading audit log...</p>}
      {isError && <p className="text-cdy-muted">Failed to load audit log.</p>}

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
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cdy-navy-border bg-cdy-navy-light">
                {data.data.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs text-cdy-muted">
                      {format(new Date(log.createdAt), 'MMM d HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">{log.userEmail}</td>
                    <td className={cn('px-4 py-3 font-mono text-xs', actionColor(log.action))}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {log.entityType} —{' '}
                      <span className="font-mono text-xs text-cdy-muted">
                        {log.entityId.slice(0, 12)}
                        {log.entityId.length > 12 ? '…' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">{formatActionDetails(log)}</td>
                    <td className="px-4 py-3">
                      {(log.previousValue || log.newValue) && (
                        <Button variant="ghost" size="sm" onClick={() => setDiffLog(log)}>
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

      {diffLog && <DiffModal log={diffLog} onClose={() => setDiffLog(null)} />}
    </div>
  );
}
