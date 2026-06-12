'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ApiResponse } from '@cdy/shared';

interface ItOverview {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  pendingAccessRequests: number;
  recentActivity: Array<{
    id: string;
    action: string;
    performedByEmail: string;
    targetType: string;
    createdAt: string;
  }>;
}

export default function ItOverviewPage(): JSX.Element {
  const [overview, setOverview] = useState<ItOverview | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<ItOverview>>('/it/overview')
      .then((res) => setOverview(res.data.data))
      .catch(() => setOverview(null));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cdy-white">IT Overview</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/it/users">Add User</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/it/roles">Create Role</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total users', value: overview?.totalUsers ?? '—' },
          { label: 'Active users', value: overview?.activeUsers ?? '—' },
          { label: 'Total roles', value: overview?.totalRoles ?? '—' },
          { label: 'Pending requests', value: overview?.pendingAccessRequests ?? '—' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-sm text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-cdy-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <h2 className="mb-4 text-lg font-medium text-cdy-white">Recent activity</h2>
        <div className="space-y-2">
          {(overview?.recentActivity ?? []).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between border-b border-cdy-navy-border/50 py-2 text-sm last:border-0"
            >
              <span className="text-cdy-white">{entry.action}</span>
              <span className="text-cdy-muted">{entry.performedByEmail}</span>
              <span className="text-cdy-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {!overview?.recentActivity?.length && (
            <p className="text-sm text-cdy-muted">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
