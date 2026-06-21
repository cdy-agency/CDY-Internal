'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ProjectStatus } from '@cdy/shared';
import type { PortfolioReportFilters, ProjectHealth } from '@cdy/shared';
import { usePortfolioReport } from '@/hooks/useProjects';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS_OPTIONS: Array<{ label: string; value?: ProjectStatus }> = [
  { label: 'All' },
  { label: 'Active', value: ProjectStatus.ACTIVE },
  { label: 'Completed', value: ProjectStatus.COMPLETED },
  { label: 'On Hold', value: ProjectStatus.ON_HOLD },
];

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  ON_TRACK: '✅ On track',
  NEEDS_ATTENTION: '⚠ Needs attention',
  AT_RISK: '🔴 At risk',
};

function healthBadge(health: ProjectHealth): string {
  if (health === 'ON_TRACK') return 'text-emerald-400';
  if (health === 'NEEDS_ATTENTION') return 'text-amber-400';
  return 'text-cdy-red';
}

export default function PortfolioReportPage(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>();
  const [serviceFilter, setServiceFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters: PortfolioReportFilters = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
      ...(serviceFilter && { serviceType: serviceFilter }),
      ...(from && { from }),
      ...(to && { to }),
    }),
    [statusFilter, serviceFilter, from, to],
  );

  const { data, isLoading } = usePortfolioReport(filters);

  const serviceTypes = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.summary.byServiceType).sort(
      (a, b) => b[1] - a[1],
    );
  }, [data]);

  const maxServiceCost = Math.max(
    ...Object.values(data?.summary.serviceCost ?? { x: 1 }),
    1,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects/reports"
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-cdy-white">
          Portfolio Overview
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">Status</label>
          <select
            value={statusFilter ?? ''}
            onChange={(e) =>
              setStatusFilter(
                e.target.value ? (e.target.value as ProjectStatus) : undefined,
              )
            }
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">
            Service type
          </label>
          <input
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            placeholder="All"
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white"
          />
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-white">
                {data.summary.totalProjects}
              </p>
              <p className="text-xs text-cdy-muted">Total Projects</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-emerald-400">
                {data.summary.byStatus.active}
              </p>
              <p className="text-xs text-cdy-muted">Active</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-cdy-white">
                {data.summary.byStatus.completed}
              </p>
              <p className="text-xs text-cdy-muted">Completed</p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4 text-center">
              <p className="text-2xl font-semibold text-amber-400">
                {data.summary.byStatus.onHold}
              </p>
              <p className="text-xs text-cdy-muted">On Hold</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
              <p className="text-sm text-cdy-muted">Revenue Potential</p>
              <p className="text-xl font-semibold text-cdy-white">
                {formatCurrency(data.summary.totalRevenuePotential)}
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
              <p className="text-sm text-cdy-muted">Projects At Risk</p>
              <p className="text-xl font-semibold text-cdy-red">
                {data.activeProjects.atRisk}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h2 className="mb-4 font-semibold text-cdy-white">
              Project Health Matrix
            </h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Count</th>
                  <th className="px-3 py-2 font-medium">Action needed</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-cdy-navy-border/50">
                  <td className="px-3 py-2 text-emerald-400">✅ On track</td>
                  <td className="px-3 py-2 text-cdy-white">
                    {data.activeProjects.onTrack}
                  </td>
                  <td className="px-3 py-2 text-cdy-muted">—</td>
                </tr>
                <tr className="border-b border-cdy-navy-border/50">
                  <td className="px-3 py-2 text-amber-400">
                    ⚠ Needs attention
                  </td>
                  <td className="px-3 py-2 text-cdy-white">
                    {data.activeProjects.needsAttention}
                  </td>
                  <td className="px-3 py-2 text-cdy-muted">
                    {data.activeProjects.needsAttention > 0
                      ? `${data.activeProjects.needsAttention} project${data.activeProjects.needsAttention > 1 ? 's have' : ' has'} blocked tasks`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-cdy-red">🔴 At risk</td>
                  <td className="px-3 py-2 text-cdy-white">
                    {data.activeProjects.atRisk}
                  </td>
                  <td className="px-3 py-2 text-cdy-muted">
                    {data.activeProjects.atRisk > 0
                      ? `${data.activeProjects.atRisk} project${data.activeProjects.atRisk > 1 ? 's have' : ' has'} overdue tasks near deadline`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h2 className="mb-4 font-semibold text-cdy-white">
              Service Type Breakdown
            </h2>
            <div className="space-y-3">
              {serviceTypes.map(([service, count]) => {
                const revenue = data.summary.serviceCost[service] ?? 0;
                const barWidth = (revenue / maxServiceCost) * 100;
                return (
                  <div key={service}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-cdy-white">
                        {service.replace(/_/g, ' ')}
                      </span>
                      <span className="text-cdy-muted">
                        {count} projects · {formatCurrency(revenue)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                      <div
                        className="h-full rounded-full bg-cdy-red"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium">End date</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.activeProjects.projects.map((p) => (
                  <tr
                    key={p.projectId}
                    className="border-b border-cdy-navy-border/50"
                  >
                    <td className="px-4 py-3 text-cdy-muted">{p.projectCode}</td>
                    <td className="px-4 py-3 text-cdy-white">{p.name}</td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {p.client ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">{p.progress}%</td>
                    <td className={cn('px-4 py-3', healthBadge(p.health))}>
                      {HEALTH_LABELS[p.health]}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {p.endDate
                        ? format(parseISO(p.endDate), 'MMM d, yyyy')
                        : 'Ongoing'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.projectId}`}
                        className="text-cdy-red hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
