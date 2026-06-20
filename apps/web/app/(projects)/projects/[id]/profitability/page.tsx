'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProject, useProjectProfitability } from '@/hooks/useProjects';
import { cn, formatCurrency } from '@/lib/utils';

function marginColor(margin: number): string {
  if (margin >= 40) return 'text-emerald-400';
  if (margin >= 20) return 'text-amber-400';
  return 'text-cdy-red';
}

export default function ProjectProfitabilityPage(): JSX.Element {
  const params = useParams();
  const projectId = String(params.id);
  const { data: project } = useProject(projectId);
  const { data, isLoading } = useProjectProfitability(projectId);

  const currency = project?.currency ?? 'RWF';
  const margin = data?.profitability.grossMargin ?? 0;
  const maxBar = Math.max(
    data?.revenue.invoiced ?? 0,
    data?.costs.total ?? 0,
    1,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Back to project
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-cdy-white">
          Profitability — {project?.name ?? '…'}
        </h1>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Revenue Invoiced</p>
              <p className="text-2xl font-semibold text-cdy-white">
                {formatCurrency(data.revenue.invoiced, currency)}
              </p>
              <p className="mt-1 text-xs text-cdy-muted">
                Collected: {formatCurrency(data.revenue.collected, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Labour Cost</p>
              <p className="text-2xl font-semibold text-cdy-white">
                {formatCurrency(data.costs.labour, currency)}
              </p>
              <p className="mt-1 text-xs text-cdy-muted">
                Hours: {data.time.totalHours}h ({data.time.billableHours}h
                billable)
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Gross Margin</p>
              <p className={cn('text-2xl font-semibold', marginColor(margin))}>
                {margin.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-cdy-muted">
                {data.profitability.isHealthy ? '✅ Healthy (>40%)' : '⚠ Below target'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h2 className="mb-4 font-semibold text-cdy-white">
              Revenue vs Cost
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Revenue', value: data.revenue.invoiced, color: 'bg-emerald-500' },
                { label: 'Labour cost', value: data.costs.labour, color: 'bg-blue-500' },
                { label: 'Direct expenses', value: data.costs.directExpenses, color: 'bg-amber-500' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-cdy-muted">
                    <span>{row.label}</span>
                    <span>{formatCurrency(row.value, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className={cn('h-full rounded-full', row.color)}
                      style={{ width: `${(row.value / maxBar) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-2 font-medium text-cdy-white">
                Profit: {formatCurrency(data.profitability.grossProfit, currency)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h2 className="mb-4 font-semibold text-cdy-white">
              Milestone Billing
            </h2>
            <p className="mb-4 text-sm text-cdy-muted">
              Total to invoice: {formatCurrency(data.milestoneBilling.total, currency)}{' '}
              · Invoiced: {formatCurrency(data.milestoneBilling.invoiced, currency)} (
              {data.milestoneBilling.percentInvoiced}%)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-cdy-muted">
                    <th className="pb-2 pr-4">Milestone</th>
                    <th className="pb-2 pr-4">Billing</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-cdy-navy-border/50 last:border-0"
                    >
                      <td className="py-2 pr-4 text-cdy-white">{m.name}</td>
                      <td className="py-2 pr-4 text-cdy-muted">
                        {formatCurrency(m.billingAmount, currency)}
                      </td>
                      <td className="py-2 pr-4 text-cdy-muted">{m.status}</td>
                      <td className="py-2">
                        {m.invoiceNumber ? (
                          <Link
                            href={`/finance/invoices/${m.invoiceId}`}
                            className="text-cdy-red hover:underline"
                          >
                            {m.invoiceNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.budget && (
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
              <h2 className="mb-4 font-semibold text-cdy-white">
                Budget Tracking
              </h2>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <p className="text-cdy-muted">
                  Approved:{' '}
                  <span className="text-cdy-white">
                    {formatCurrency(data.budget.approved, currency)}
                  </span>
                </p>
                <p className="text-cdy-muted">
                  Consumed:{' '}
                  <span className="text-cdy-white">
                    {formatCurrency(data.budget.consumed, currency)}
                  </span>
                </p>
                <p className="text-cdy-muted">
                  Remaining:{' '}
                  <span className="text-cdy-white">
                    {formatCurrency(data.budget.remaining, currency)}
                  </span>
                </p>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-cdy-muted">
                  <span>
                    {data.budget.percentConsumed ?? 0}% consumed
                  </span>
                  <span>Alert at {data.budget.alertThresholdPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      (data.budget.percentConsumed ?? 0) >=
                        data.budget.alertThresholdPct
                        ? 'bg-cdy-red'
                        : (data.budget.percentConsumed ?? 0) >=
                            data.budget.alertThresholdPct - 10
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                    style={{
                      width: `${Math.min(data.budget.percentConsumed ?? 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
