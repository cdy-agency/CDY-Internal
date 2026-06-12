'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SourceAnalysisReport } from '@cdy/shared';
import { useSourceAnalysisReport } from '@/hooks/useCrm';
import { ReportFilterBar } from '@/components/finance/reports/ReportFilterBar';
import { buildCrmReportPresets } from '@/lib/reportDates';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

function conversionRowClass(rate: number): string {
  if (rate > 50) return 'bg-emerald-500/10';
  if (rate >= 25) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

export default function SourceAnalysisPage(): JSX.Element {
  const presets = useMemo(() => buildCrmReportPresets(), []);
  const [activePreset, setActivePreset] = useState(presets[0].id);
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);

  const { data: report, isLoading } = useSourceAnalysisReport({
    from: new Date(from).toISOString(),
    to: new Date(to + 'T23:59:59').toISOString(),
  });

  const totals = report?.sources.reduce(
    (acc, row: SourceAnalysisReport['sources'][number]) => ({
      totalLeads: acc.totalLeads + row.totalLeads,
      dealsWon: acc.dealsWon + row.dealsWon,
      dealsLost: acc.dealsLost + row.dealsLost,
      totalRevenue: acc.totalRevenue + row.totalRevenue,
    }),
    { totalLeads: 0, dealsWon: 0, dealsLost: 0, totalRevenue: 0 },
  );

  const totalConversion =
    totals && totals.dealsWon + totals.dealsLost > 0
      ? Number(
          ((totals.dealsWon / (totals.dealsWon + totals.dealsLost)) * 100).toFixed(1),
        )
      : 0;

  const avgDeal =
    totals && totals.dealsWon > 0
      ? totals.totalRevenue / totals.dealsWon
      : 0;

  const maxRevenue = Math.max(
    ...(report?.sources.map((s: SourceAnalysisReport['sources'][number]) => s.totalRevenue) ?? [1]),
    1,
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">CRM</Link>
        <span className="mx-2">/</span>
        <Link href="/crm/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Source Analysis</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">Lead Source Analysis</h1>

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
      />

      {isLoading && <p className="text-cdy-muted">Loading report...</p>}

      {report && (
        <>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead className="bg-cdy-navy text-left text-xs uppercase text-cdy-muted">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Leads</th>
                  <th className="px-4 py-3">Won</th>
                  <th className="px-4 py-3">Lost</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Conversion</th>
                  <th className="px-4 py-3">Avg Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cdy-navy-border bg-cdy-navy-light">
                {report.sources.map((row) => (
                  <tr
                    key={row.source}
                    className={cn(conversionRowClass(row.conversionRate))}
                  >
                    <td className="px-4 py-3 text-cdy-white">
                      {row.source.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">{row.totalLeads}</td>
                    <td className="px-4 py-3 text-cdy-muted">{row.dealsWon}</td>
                    <td className="px-4 py-3 text-cdy-muted">{row.dealsLost}</td>
                    <td className="px-4 py-3 text-cdy-white">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {formatCurrency(row.avgDealValue)}
                    </td>
                  </tr>
                ))}
                {totals && (
                  <tr className="bg-cdy-navy font-medium">
                    <td className="px-4 py-3 text-cdy-white">TOTAL</td>
                    <td className="px-4 py-3 text-cdy-white">{totals.totalLeads}</td>
                    <td className="px-4 py-3 text-cdy-white">{totals.dealsWon}</td>
                    <td className="px-4 py-3 text-cdy-white">{totals.dealsLost}</td>
                    <td className="px-4 py-3 text-cdy-white">
                      {formatCurrency(totals.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">{totalConversion}%</td>
                    <td className="px-4 py-3 text-cdy-white">
                      {formatCurrency(avgDeal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="mb-4 font-medium text-cdy-white">Revenue by source</h2>
            <div className="space-y-3">
              {report.sources
                .filter((s) => s.totalRevenue > 0)
                .map((row) => {
                  const barPct = Math.round((row.totalRevenue / maxRevenue) * 100);
                  return (
                    <div key={row.source}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="w-32 shrink-0 text-cdy-muted">
                          {row.source.replace(/_/g, ' ')}
                        </span>
                        <span className="text-cdy-white">
                          {formatCurrency(row.totalRevenue)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded bg-cdy-navy">
                        <div
                          className="h-full bg-cdy-red"
                          style={{ width: `${Math.max(barPct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
