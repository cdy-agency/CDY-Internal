'use client';

import { Fragment, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';

interface AuditEntry {
  id: string;
  performedByEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  'user.created': 'text-blue-400',
  'user.role_changed': 'text-amber-400',
  'user.deactivated': 'text-red-400',
  'role.created': 'text-blue-400',
  'permission.bulk_updated': 'text-amber-400',
  'role.deleted': 'text-red-400',
};

export default function ItAuditPage(): JSX.Element {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<AuditResponse>>('/it/audit')
      .then((res) => setData(res.data.data))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-cdy-white">IT Audit Log</h1>
      <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
        <table className="w-full text-sm">
          <thead className="bg-cdy-navy-light text-left text-cdy-muted">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">IT user</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).map((entry) => (
              <Fragment key={entry.id}>
                <tr
                  className="cursor-pointer border-t border-cdy-navy-border hover:bg-cdy-navy-light/50"
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <td className="p-3 text-cdy-muted">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-cdy-white">{entry.performedByEmail}</td>
                  <td className={`p-3 ${actionColors[entry.action] ?? 'text-cdy-white'}`}>
                    {entry.action}
                  </td>
                  <td className="p-3 text-cdy-muted">
                    {entry.targetType} · {entry.targetId.slice(0, 8)}…
                  </td>
                </tr>
                {expanded === entry.id && (
                  <tr key={`${entry.id}-detail`} className="border-t border-cdy-navy-border">
                    <td colSpan={4} className="bg-cdy-navy p-4 font-mono text-xs text-cdy-muted">
                      <div>Previous: {JSON.stringify(entry.previousValue, null, 2)}</div>
                      <div className="mt-2">
                        New: {JSON.stringify(entry.newValue, null, 2)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
