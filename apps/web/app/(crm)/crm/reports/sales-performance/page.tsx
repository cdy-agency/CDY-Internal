'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SalesPerformanceReport } from '@cdy/shared';
import { useSalesPerformanceReport } from '@/hooks/useCrm';
import { ReportFilterBar } from '@/components/finance/reports/ReportFilterBar';
import { buildCrmReportPresets } from '@/lib/reportDates';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-amber-100 text-amber-700 border-amber-300';
  if (rank === 2) return 'bg-gray-100 text-gray-600 border-gray-300';
  if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-cdy-navy text-cdy-muted border-cdy-navy-border';
}

function progressBar(pct: number | null): string {
  if (pct == null) return 'bg-cdy-navy';
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-cdy-red';
}

export default function SalesPerformancePage(): JSX.Element {
  const presets = useMemo(() => buildCrmReportPresets(), []);
  const [activePreset, setActivePreset] = useState(presets[0].id);
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: report, isLoading } = useSalesPerformanceReport({
    from: new Date(from).toISOString(),
    to: new Date(to + 'T23:59:59').toISOString(),
  });

  const maxRevenue = Math.max(
    ...(report?.agents.map((a: SalesPerformanceReport['agents'][number]) => a.performance.totalRevenue) ?? [1]),
    1,
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">CRM</Link>
        <span className="mx-2">/</span>
        <Link href="/crm/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Sales Performance</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">Sales Performance</h1>

      <ReportFilterBar
        presets={presets}
        activePreset={activePreset}
        from={from}
        to={to}
        onPresetChange={(preset) => {
          setActivePreset(preset.id);
          setFrom(preset.from);
          setTo(preset.to);
        }}
        onCustomChange={(newFrom, newTo) => {
          setActivePreset('custom');
          setFrom(newFrom);
          setTo(newTo);
        }}
        onDownloadPdf={() => undefined}
        pdfLoading={false}
      >
        <Button size="sm" variant="outline" disabled>
          Export CSV
        </Button>
      </ReportFilterBar>

      {isLoading && <p className="text-cdy-muted">Loading report...</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 lg:grid-cols-4">
            {[
              ['Total Revenue Won', formatCurrency(report.totals.totalRevenue)],
              ['Total Deals', String(report.totals.totalDealsWon)],
              ['Avg Conversion', `${report.totals.avgConversionRate}%`],
              ['Commission Paid', formatCurrency(report.totals.totalCommission)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-cdy-muted">{label}</p>
                <p className="mt-1 text-xl font-semibold text-cdy-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {report.agents.map((agent: SalesPerformanceReport['agents'][number], idx: number) => {
              const rank = idx + 1;
              const revenuePct = agent.target?.revenueProgress ?? null;
              const dealsPct = agent.target?.dealsProgress ?? null;
              const isExpanded = expanded === agent.agentId;

              const dealsByService = agent.deals.reduce<
                Record<string, { value: number; count: number }>
              >((acc, deal) => {
                const key = deal.serviceType ?? 'Other';
                if (!acc[key]) acc[key] = { value: 0, count: 0 };
                acc[key].value += deal.value;
                acc[key].count += 1;
                return acc;
              }, {});

              return (
                <div
                  key={agent.agentId}
                  className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold',
                          rankBadgeClass(rank),
                        )}
                      >
                        #{rank}
                      </span>
                      <div>
                        <p className="font-medium text-cdy-white">{agent.agentName}</p>
                        <p className="text-sm text-cdy-muted">{agent.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded(isExpanded ? null : agent.agentId)
                      }
                    >
                      {isExpanded ? 'Hide deals' : 'Show deals'}
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricRow
                      label="Revenue Won"
                      value={formatCurrency(agent.performance.totalRevenue)}
                      progress={revenuePct}
                    />
                    <MetricRow
                      label="Deals Won"
                      value={String(agent.performance.dealsWon)}
                      progress={dealsPct}
                    />
                    <div>
                      <p className="text-xs text-cdy-muted">Leads Created</p>
                      <p className="text-lg font-semibold text-cdy-white">
                        {agent.performance.leadsCreated ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cdy-muted">Conversion Rate</p>
                      <p className="text-lg font-semibold text-cdy-white">
                        {agent.performance.conversionRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cdy-muted">Activities</p>
                      <p className="text-lg font-semibold text-cdy-white">
                        {agent.performance.activitiesCount}
                        <span className="ml-2 text-sm font-normal text-cdy-muted">
                          Proposals sent: {agent.performance.proposalsSent}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-cdy-muted">Commission</p>
                      <p className="text-lg font-semibold text-cdy-white">
                        {formatCurrency(agent.performance.totalCommission)}
                      </p>
                    </div>
                  </div>

                  {isExpanded && agent.deals.length > 0 && (
                    <div className="mt-4 border-t border-cdy-navy-border pt-4">
                      <p className="mb-3 text-sm font-medium text-cdy-white">Deals breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(dealsByService).map(([service, stats]) => {
                          const dealStats = stats as { value: number; count: number };
                          const barPct = Math.round(
                            (dealStats.value / maxRevenue) * 100,
                          );
                          return (
                            <div key={service}>
                              <div className="mb-1 flex justify-between text-sm">
                                <span className="text-cdy-muted">
                                  {service.replace(/_/g, ' ')}
                                </span>
                                <span className="text-cdy-white">
                                  {formatCurrency(dealStats.value)} ({dealStats.count} deals)
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                                <div
                                  className="h-full bg-cdy-red"
                                  style={{ width: `${Math.max(barPct, 4)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number | null;
}): JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-cdy-muted">{label}</p>
        {progress != null && (
          <span className="text-xs text-cdy-muted">{progress}% 🎯</span>
        )}
      </div>
      <p className="text-lg font-semibold text-cdy-white">{value}</p>
      {progress != null && (
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-cdy-navy">
          <div
            className={cn('h-full', progressBar(progress))}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
