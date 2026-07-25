'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useAgentDashboard } from '@/hooks/useCrm';
import { formatCurrency } from '@/lib/utils';
import { MetricCard } from '@/components/finance/MetricCard';
import { Trophy, TrendingUp, Kanban, AlertTriangle, DollarSign, UserPlus } from 'lucide-react';

function progressBarColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-cdy-red';
}

interface AgentDashboardViewProps {
  month: string;
}

export function AgentDashboardView({ month }: AgentDashboardViewProps): JSX.Element {
  const { data, isLoading } = useAgentDashboard(month);

  const revenueProgress = data?.performance.revenueProgress ?? 0;
  const targetRevenue = data?.target ? Number(data.target.revenueTarget) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">My Dashboard</h1>
        <p className="text-sm text-cdy-muted">
          Personal performance — {format(new Date(`${month}-01`), 'MMMM yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Revenue Won (MTD)"
          value={formatCurrency(data?.performance.revenueWon ?? 0)}
          delta={revenueProgress}
          deltaLabel={data?.target ? `vs target: ${revenueProgress}%` : ''}
          icon={DollarSign}
          iconColor="bg-emerald-500/10 text-[var(--cdy-success)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="Deals Closed"
          value={String(data?.performance.dealsWon ?? 0)}
          delta={data?.performance.dealsProgress ?? 0}
          deltaLabel={
            data?.target
              ? `vs target: ${data.performance.dealsProgress ?? 0}%`
              : ''
          }
          icon={Trophy}
          iconColor="bg-emerald-500/10 text-[var(--cdy-success)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="Leads Created"
          value={String(data?.performance.leadsCreated ?? 0)}
          delta={0}
          deltaLabel="this month"
          icon={UserPlus}
          iconColor="bg-blue-500/10 text-[var(--cdy-info)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="Commission Earned"
          value={formatCurrency(data?.commission.total ?? 0)}
          delta={0}
          deltaLabel={`Pending: ${formatCurrency(data?.commission.pending ?? 0)}`}
          icon={TrendingUp}
          iconColor="bg-purple-500/10 text-purple-400"
          isLoading={isLoading}
        />
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(data?.pipeline.pipelineValue ?? 0)}
          delta={0}
          deltaLabel=""
          icon={Kanban}
          iconColor="bg-amber-500/10 text-[var(--cdy-warning)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="Open Leads"
          value={String(data?.pipeline.openLeads ?? 0)}
          delta={0}
          deltaLabel=""
          icon={Kanban}
          iconColor="bg-blue-500/10 text-[var(--cdy-info)]"
          isLoading={isLoading}
        />
        <MetricCard
          label="Overdue Follow-ups"
          value={String(data?.overdueFollowUps ?? 0)}
          delta={0}
          deltaLabel=""
          icon={AlertTriangle}
          iconColor="bg-amber-500/10 text-[var(--cdy-warning)]"
          isLoading={isLoading}
        />
      </div>

      {data?.target && targetRevenue > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-cdy-muted">
              Target: {formatCurrency(targetRevenue)}
            </span>
            <span className="text-cdy-white">
              {revenueProgress}% ({formatCurrency(data.performance.revenueWon)} /{' '}
              {formatCurrency(targetRevenue)})
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-cdy-navy">
            <div
              className={`h-full transition-all ${progressBarColor(revenueProgress)}`}
              style={{ width: `${Math.min(revenueProgress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {data && (data.createdLeads?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 font-medium text-cdy-white">Leads created this month</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="px-2 py-2">Lead</th>
                  <th className="px-2 py-2">Stage</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.createdLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-cdy-navy-border/50">
                    <td className="px-2 py-2">
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="text-cdy-white hover:text-cdy-red"
                      >
                        {lead.companyName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">
                      {lead.stage.replace(/_/g, ' ')}
                    </td>
                    <td className="px-2 py-2 text-cdy-white">
                      {formatCurrency(Number(lead.estimatedValue ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">
                      {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.closedDeals.length > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 font-medium text-cdy-white">Closed deals this month</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {data.closedDeals.map((deal) => (
                  <tr key={deal.id} className="border-b border-cdy-navy-border/50">
                    <td className="px-2 py-2">
                      <Link
                        href={`/crm/leads/${deal.id}`}
                        className="text-cdy-white hover:text-cdy-red"
                      >
                        {deal.companyName}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">
                      {deal.serviceInterest.replace('_', ' ')}
                    </td>
                    <td className="px-2 py-2 text-cdy-white">
                      {formatCurrency(Number(deal.estimatedValue ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">
                      {deal.convertedAt
                        ? format(new Date(deal.convertedAt), 'MMM d, yyyy')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.commission.records.length > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 font-medium text-cdy-white">Commission this month</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="px-2 py-2">Deal</th>
                  <th className="px-2 py-2">Rate</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.commission.records.map((record) => (
                  <tr key={record.id} className="border-b border-cdy-navy-border/50">
                    <td className="px-2 py-2 text-cdy-white">
                      {record.companyName}{' '}
                      <span className="text-cdy-muted">
                        {formatCurrency(record.dealValue)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">{record.ratePercent}%</td>
                    <td className="px-2 py-2 text-cdy-white">
                      {formatCurrency(
                        record.adjustedAmount ?? record.calculatedAmount,
                      )}
                    </td>
                    <td className="px-2 py-2 text-cdy-muted">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <span className="text-cdy-muted">
              Total:{' '}
              <span className="text-cdy-white">
                {formatCurrency(data.commission.total)}
              </span>
            </span>
            <span className="text-cdy-muted">
              Approved:{' '}
              <span className="text-cdy-white">
                {formatCurrency(data.commission.approved)}
              </span>
            </span>
          </div>
        </div>
      )}

      {data && (
        <p className="text-sm text-cdy-muted">
          Activities this month: {data.activities}
          {Object.entries(data.activitiesByType).length > 0 && (
            <>
              {' — '}
              {Object.entries(data.activitiesByType)
                .map(([type, count]) => `${type}: ${count}`)
                .join(' | ')}
            </>
          )}
        </p>
      )}

      {data && data.overdueItems.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="font-medium text-amber-400">
            ⚠ {data.overdueFollowUps} overdue follow-up actions
          </p>
          <ul className="mt-2 space-y-1 text-sm text-cdy-muted">
            {data.overdueItems.map((item) => (
              <li key={item.leadId}>
                <Link href={`/crm/leads/${item.leadId}`} className="hover:text-cdy-white">
                  {item.companyName}
                </Link>
                {' — '}
                {item.nextAction} (due{' '}
                {format(new Date(item.nextActionDate), 'MMM d')})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
