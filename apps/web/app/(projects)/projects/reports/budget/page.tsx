'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BudgetVsActualReport, PortfolioReportFilters } from '@cdy/shared';
import { useBudgetVsActualReport } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

function varianceColor(variancePercent: number, isOverBudget: boolean): string {
  if (isOverBudget && variancePercent < -10) return 'text-cdy-red';
  if (isOverBudget || variancePercent < 0) return 'text-amber-400';
  return 'text-emerald-400';
}

function exportBudgetCsv(report: BudgetVsActualReport): void {
  const headers = [
    'Project Code',
    'Name',
    'Client',
    'Approved Budget',
    'Labour Cost',
    'Direct Costs',
    'Total Actual',
    'Variance',
    'Variance %',
    'Over Budget',
  ];
  const rows = report.projects.map((r) => [
    r.projectCode ?? '',
    r.name ?? '',
    r.client ?? '',
    r.approvedBudget.toFixed(2),
    r.labourCost.toFixed(2),
    r.directCosts.toFixed(2),
    r.actualCosts.toFixed(2),
    r.variance.toFixed(2),
    r.variancePercent.toFixed(2),
    r.isOverBudget ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-vs-actual-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BudgetVsActualPage(): JSX.Element {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters: PortfolioReportFilters = useMemo(
    () => ({
      ...(from && { from }),
      ...(to && { to }),
    }),
    [from, to],
  );

  const { data, isLoading } = useBudgetVsActualReport(filters);

  const utilisation =
    data && data.totals.totalApprovedBudget > 0
      ? (
          (data.totals.totalActualCosts / data.totals.totalApprovedBudget) *
          100
        ).toFixed(1)
      : '0';

  const avgVariance =
    data && data.projects.length > 0
      ? (
          data.projects.reduce((s, r) => s + r.variancePercent, 0) /
          data.projects.length
        ).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projects/reports"
            className="text-sm text-cdy-muted hover:text-cdy-white"
          >
            ← Reports
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-cdy-white">
            Budget vs Actual
          </h1>
        </div>
        <Button
          variant="outline"
          disabled={!data}
          onClick={() => data && exportBudgetCsv(data)}
        >
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
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
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <span className="text-cdy-muted">
                Total approved budget:{' '}
                <strong className="text-cdy-white">
                  {formatCurrency(data.totals.totalApprovedBudget)}
                </strong>
              </span>
              <span className="text-cdy-muted">
                Total actual costs:{' '}
                <strong className="text-cdy-white">
                  {formatCurrency(data.totals.totalActualCosts)}
                </strong>
              </span>
              <span className="text-cdy-muted">
                Overall utilisation:{' '}
                <strong className="text-cdy-white">{utilisation}%</strong>
              </span>
              <span className="text-cdy-muted">
                Projects over budget:{' '}
                <strong className="text-cdy-red">
                  {data.totals.projectsOverBudget}
                </strong>
              </span>
              <span className="text-cdy-muted">
                Average variance:{' '}
                <strong className="text-emerald-400">+{avgVariance}%</strong>{' '}
                (under budget)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Labour</th>
                  <th className="px-4 py-3 font-medium">Expenses</th>
                  <th className="px-4 py-3 font-medium">Total Actual</th>
                  <th className="px-4 py-3 font-medium">Variance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((row) => (
                  <tr
                    key={row.projectId}
                    className="cursor-pointer border-b border-cdy-navy-border/50 hover:bg-cdy-navy/50"
                    onClick={() =>
                      router.push(`/projects/${row.projectId}/profitability`)
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-cdy-white">{row.name}</p>
                      <p className="text-xs text-cdy-muted">
                        {row.projectCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {formatCurrency(row.approvedBudget)}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {formatCurrency(row.labourCost)}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {formatCurrency(row.directCosts)}
                    </td>
                    <td className="px-4 py-3 text-cdy-white">
                      {formatCurrency(row.actualCosts)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 font-medium',
                        varianceColor(row.variancePercent, row.isOverBudget),
                      )}
                    >
                      {row.variance >= 0 ? '+' : ''}
                      {formatCurrency(row.variance)}
                    </td>
                    <td className="px-4 py-3">
                      {row.isOverBudget ? (
                        <span className="text-cdy-red">🔴 Over</span>
                      ) : (
                        <span className="text-emerald-400">✅ Under</span>
                      )}
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
