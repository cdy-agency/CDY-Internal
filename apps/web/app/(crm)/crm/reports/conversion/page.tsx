'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  startOfYear,
} from 'date-fns';
import { PipelineStage } from '@cdy/shared';
import { useConversionReport } from '@/hooks/useCrm';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type PeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'ytd';

function getPeriodRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
    case 'last_month': {
      const last = subMonths(now, 1);
      return {
        from: startOfMonth(last).toISOString(),
        to: endOfMonth(last).toISOString(),
      };
    }
    case 'this_quarter':
      return {
        from: startOfQuarter(now).toISOString(),
        to: now.toISOString(),
      };
    case 'ytd':
      return {
        from: startOfYear(now).toISOString(),
        to: now.toISOString(),
      };
    default:
      return {
        from: startOfMonth(now).toISOString(),
        to: now.toISOString(),
      };
  }
}

export default function ConversionReportPage(): JSX.Element {
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const period = useMemo(() => getPeriodRange(preset), [preset]);
  const { data: report, isLoading } = useConversionReport(period);

  const funnelStages = [
    { label: 'Created', count: report?.funnel.totalCreated ?? 0 },
    {
      label: 'Contacted',
      count: report?.funnel.byStage[PipelineStage.CONTACTED] ?? 0,
    },
    {
      label: 'Proposal Sent',
      count: report?.funnel.byStage[PipelineStage.PROPOSAL_SENT] ?? 0,
    },
    {
      label: 'Negotiation',
      count: report?.funnel.byStage[PipelineStage.NEGOTIATION] ?? 0,
    },
    {
      label: 'Closed Won',
      count: report?.funnel.closedWon ?? 0,
    },
  ];

  const maxFunnel = Math.max(...funnelStages.map((s) => s.count), 1);
  const lostTotal = report?.lostReasons.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">CRM</Link>
        <span className="mx-2">/</span>
        <Link href="/crm/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Conversion Report</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Conversion Report</h1>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['this_month', 'This Month'],
              ['last_month', 'Last Month'],
              ['this_quarter', 'This Quarter'],
              ['ytd', 'YTD'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={preset === key ? 'default' : 'outline'}
              className={preset === key ? 'bg-cdy-red hover:bg-cdy-red/90' : ''}
              onClick={() => setPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading report...</p>}

      {report && (
        <>
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-8">
            <h2 className="mb-6 text-center text-lg font-medium text-cdy-white">
              Conversion Funnel
            </h2>
            <div className="mx-auto flex max-w-lg flex-col items-center gap-1">
              {funnelStages.map((stage, idx) => {
                const widthPct = Math.max((stage.count / maxFunnel) * 100, 20);
                const prevCount = idx > 0 ? funnelStages[idx - 1].count : stage.count;
                const pctOfPrev =
                  prevCount > 0 && idx > 0
                    ? ((stage.count / prevCount) * 100).toFixed(1)
                    : '100.0';
                return (
                  <div key={stage.label} className="w-full text-center">
                    <div
                      className="mx-auto border-x-[transparent] border-b-cdy-red border-x-[1.5rem] border-b-[2rem] border-solid"
                      style={{
                        width: `${widthPct}%`,
                        minWidth: '120px',
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                      }}
                    />
                    <p className="py-2 text-sm text-cdy-white">
                      {stage.count} {stage.label}
                      {idx > 0 && (
                        <span className="ml-2 text-cdy-muted">({pctOfPrev}%)</span>
                      )}
                    </p>
                  </div>
                );
              })}
              <div className="mt-2 flex w-full justify-center gap-8 text-sm">
                <span className="text-emerald-400">
                  {report.funnel.closedWon} WON ({report.metrics.conversionRate}%)
                </span>
                <span className="text-cdy-red">{report.funnel.closedLost} LOST</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Conversion Rate', `${report.metrics.conversionRate}%`],
              ['Total Revenue Won', formatCurrency(report.metrics.totalRevenue)],
              ['Avg Deal Value', formatCurrency(report.metrics.avgDealValue)],
              ['Avg Days to Close', `${report.metrics.avgDaysToClose} days`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
              >
                <p className="text-xs text-cdy-muted">{label}</p>
                <p className="mt-1 text-xl font-semibold text-cdy-white">{value}</p>
              </div>
            ))}
          </div>

          {report.lostReasons.length > 0 && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
              <h2 className="mb-4 font-medium text-cdy-white">Why deals were lost</h2>
              <div className="space-y-3">
                {report.lostReasons.map((item) => {
                  const pct =
                    lostTotal > 0 ? Math.round((item.count / lostTotal) * 100) : 0;
                  return (
                    <div key={item.reason}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-cdy-muted">{item.reason}</span>
                        <span className="text-cdy-white">
                          {item.count} deals ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                        <div className="h-full bg-cdy-red" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.bySource.length > 0 && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
              <h2 className="mb-4 font-medium text-cdy-white">Source performance</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="px-2 py-2">Source</th>
                    <th className="px-2 py-2">Won</th>
                    <th className="px-2 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySource.map((row) => (
                    <tr key={row.source} className="border-b border-cdy-navy-border/50">
                      <td className="px-2 py-2 text-cdy-white">
                        {row.source.replace('_', ' ')}
                      </td>
                      <td className="px-2 py-2 text-cdy-muted">{row.count}</td>
                      <td className="px-2 py-2 text-cdy-white">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.agentPerformance.length > 0 && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
              <h2 className="mb-4 font-medium text-cdy-white">Agent performance</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="px-2 py-2">Agent</th>
                    <th className="px-2 py-2">Deals Won</th>
                    <th className="px-2 py-2">Revenue Won</th>
                    <th className="px-2 py-2">Avg Deal Size</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agentPerformance.map((row) => (
                    <tr key={row.agentId} className="border-b border-cdy-navy-border/50">
                      <td className="px-2 py-2 text-cdy-white">{row.agentName}</td>
                      <td className="px-2 py-2 text-cdy-muted">{row.dealsWon}</td>
                      <td className="px-2 py-2 text-cdy-white">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-2 py-2 text-cdy-muted">
                        {formatCurrency(row.dealsWon > 0 ? row.revenue / row.dealsWon : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
