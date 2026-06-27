'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  MetricHero,
  SectionCard,
  DonutChart,
  LineChart,
  GaugeChart,
} from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import api from '@/lib/api';
import type { ApiResponse } from '@cdy/shared';
import { Button } from '@/components/ui/button';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MonthPoint { month: string; value: number }

interface TopAgent {
  assignedTo: string | null;
  _count: { id: number };
  _sum: { estimatedValue: number | null };
}

interface VentureSummary {
  id: string;
  name: string;
  color: string;
  income: number;
  expenses: number;
  net: number;
}

interface CeoSummary {
  generatedAt: string;
  finance: {
    revenueMTD: number;
    revenueLastMonth: number;
    revenueTrend: number;
    collectedMTD: number;
    outstandingAR: number;
    overdueAmount: number;
    overdueCount: number;
    expensesMTD: number;
    totalMRR: number;
    activeRetainers: number;
    pendingCommissions: number;
    monthlyRevenueTrend: MonthPoint[];
    invoicesByStatus: Record<string, number>;
    reserve: {
      balance: number;
      currency: string;
    };
    charts: {
      incomeByService: Array<{
        service: string;
        label: string;
        amount: number;
        count: number;
        percentage: number;
      }>;
      paymentByMethod: Array<{
        method: string;
        label: string;
        amount: number;
        count: number;
        percentage: number;
      }>;
      paymentMethodSummary: Array<{
        method: string;
        label: string;
        color: string;
        income: { amount: number; count: number };
        expenses: { amount: number; count: number };
        net: number;
      }>;
    };
  };
  crm: {
    totalLeadsMTD: number;
    pipelineValue: number;
    closedWonMTD: number;
    conversionRate: number;
    leadsByStage: Record<string, number>;
    topAgents: TopAgent[];
  };
  hr: {
    totalEmployees: number;
    activeEmployees: number;
    onLeaveToday: number;
    pendingLeaveRequests: number;
    presentToday: number;
    pendingPerformanceReviews: number;
  };
  projects: {
    activeProjects: number;
    overdueTasks: number;
    blockedTasks: number;
    recentProjects: Array<{
      id: string;
      name: string;
      client: { companyName: string } | null;
      _count: { tasks: number };
    }>;
  };
  services: {
    marketingClients: number;
    softwareProjects: number;
    brandingProjects: number;
    activeCampaigns: number;
    salesCampaigns: number;
    activeSubscriptions: number;
    openTickets: number;
  };
  ventures: {
    total: number;
    totalIncome: number;
    totalExpenses: number;
    totalNet: number;
    list: VentureSummary[];
  };
  alerts: {
    pendingCommissions: number;
    pendingLeaveRequests: number;
    pendingBudgetRequests: number;
    overdueInvoices: number;
    blockedTasks: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ceoServiceColor(service: string): string {
  const map: Record<string, string> = {
    SOFTWARE_DEV:         '#60a5fa',
    BRANDING:             '#c084fc',
    SOCIAL_MEDIA:         '#f472b6',
    INFLUENCER_MARKETING: '#fbbf24',
    SALES_SERVICES:       '#34d399',
    GENERAL:              '#9ca3af',
  };
  return map[service] ?? '#9ca3af';
}

function ceoPaymentColor(method: string): string {
  const map: Record<string, string> = {
    BANK_TRANSFER: '#60a5fa',
    MTN_MOMO:      '#fbbf24',
    AIRTEL_MONEY:  '#f97316',
    CARD:          '#c084fc',
    CASH:          '#34d399',
    OTHER:         '#9ca3af',
  };
  return map[method] ?? '#9ca3af';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CeoDashboardPage() {
  const { data: summary, isLoading, refetch, dataUpdatedAt } = useQuery<CeoSummary>({
    queryKey: ['ceo', 'summary'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CeoSummary>>('/ceo/summary');
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const alerts = summary?.alerts;
  const hasAlerts = alerts && Object.values(alerts).some((v) => Number(v) > 0);

  const attendanceRate =
    summary && summary.hr.totalEmployees > 0
      ? Math.round((summary.hr.presentToday / summary.hr.totalEmployees) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-cdy-navy">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-cdy-navy-border bg-cdy-navy px-4 py-4 shadow-sm sm:px-6">
      <div className="mx-auto flex flex-wrap max-w-[1400px] items-start justify-between gap-3 px-2 sm:px-0">
          <div>
            <h1 className="text-xl font-bold text-cdy-white">CDY Global Dashboard</h1>
            <p className="mt-0.5 text-xs text-cdy-muted">
              {dataUpdatedAt
                ? `Last updated ${format(new Date(dataUpdatedAt), 'h:mm a')}`
                : 'Loading…'}
              <button
                onClick={() => void refetch()}
                className="ml-2 text-cdy-red hover:underline"
              >
                Refresh
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['This Month', 'Last Month', 'This Quarter', 'YTD'] as const).map((p) => (
              <button
                key={p}
                className="rounded-lg px-3 py-1.5 text-sm text-cdy-muted hover:bg-cdy-navy-light transition-colors"
              >
                {p}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('service-lines')?.scrollIntoView({ behavior: 'smooth' })}
                className="ml-2 rounded-md bg-cdy-red px-3 py-1.5 text-sm font-medium text-white hover:bg-cdy-red/90"
              >
                Service Lines
              </button>
              <Link href="/finance" className="ml-1 hidden rounded px-2 py-1 text-sm text-cdy-muted hover:text-cdy-white md:inline-block">
                Go to Finance →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
        {/* Row 1 — Alerts */}
        {hasAlerts && (
          <SectionCard title="⚡ Actions needed">
            <div className="flex flex-wrap gap-3">
              {(alerts.pendingCommissions ?? 0) > 0 && (
                <Link href="/finance/commissions"
                  className="flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-900/50 transition-colors">
                  💰 {alerts.pendingCommissions} commission{alerts.pendingCommissions > 1 ? 's' : ''} to approve →
                </Link>
              )}
              {(alerts.pendingLeaveRequests ?? 0) > 0 && (
                <Link href="/hr/leave"
                  className="flex items-center gap-2 rounded-lg border border-blue-800 bg-blue-900/30 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-900/50 transition-colors">
                  📋 {alerts.pendingLeaveRequests} leave request{alerts.pendingLeaveRequests > 1 ? 's' : ''} pending →
                </Link>
              )}
              {(alerts.pendingBudgetRequests ?? 0) > 0 && (
                <Link href="/finance/budget"
                  className="flex items-center gap-2 rounded-lg border border-purple-800 bg-purple-900/30 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-900/50 transition-colors">
                  🏗 {alerts.pendingBudgetRequests} budget increase{alerts.pendingBudgetRequests > 1 ? 's' : ''} to approve →
                </Link>
              )}
              {(alerts.overdueInvoices ?? 0) > 0 && (
                <Link href="/finance/ar"
                  className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/50 transition-colors">
                  🔴 {alerts.overdueInvoices} overdue invoice{alerts.overdueInvoices > 1 ? 's' : ''} →
                </Link>
              )}
              {(alerts.blockedTasks ?? 0) > 0 && (
                <Link href="/projects"
                  className="flex items-center gap-2 rounded-lg border border-orange-800 bg-orange-900/30 px-4 py-2 text-sm font-medium text-orange-400 hover:bg-orange-900/50 transition-colors">
                  🚧 {alerts.blockedTasks} blocked task{alerts.blockedTasks > 1 ? 's' : ''} →
                </Link>
              )}
            </div>
          </SectionCard>
        )}

        {/* Row 2 — Finance hero metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="mt-2 h-8 w-32" />
              </div>
            ))
          ) : (
            <>
              <SectionCard>
                  <MetricHero
                    value={`RWF${(summary?.finance.revenueMTD ?? 0).toLocaleString()}`}
                  label="Revenue this month"
                  trend={summary?.finance.revenueTrend}
                  trendLabel="vs last month"
                  size="md"
                />
              </SectionCard>
              <SectionCard>
                <MetricHero
                  value={`RWF${(summary?.finance.collectedMTD ?? 0).toLocaleString()}`}
                  label="Cash collected MTD"
                  size="md"
                />
              </SectionCard>
              <SectionCard>
                <MetricHero
                  value={`RWF${(summary?.finance.outstandingAR ?? 0).toLocaleString()}`}
                  label="Outstanding AR"
                  size="md"
                />
              </SectionCard>
              <SectionCard>
                <MetricHero
                  value={`RWF${(summary?.finance.totalMRR ?? 0).toLocaleString()}`}
                  label="Monthly recurring"
                  badge={`${summary?.finance.activeRetainers ?? 0} retainers`}
                  badgeVariant="blue"
                  size="md"
                />
              </SectionCard>
            </>
          )}
        </div>

        {/* Row 3 — Finance charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="Revenue — 6 months" className="lg:col-span-2">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <LineChart
                labels={(summary?.finance.monthlyRevenueTrend ?? []).map((m) => m.month)}
                series={[
                  {
                    label: 'Revenue',
                    color: '#C41E3A',
                    data: (summary?.finance.monthlyRevenueTrend ?? []).map((m) => m.value),
                  },
                ]}
                height={150}
              />
            )}
          </SectionCard>
          <SectionCard title="Invoice status">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <DonutChart
                  segments={[
                    { label: 'Paid',    value: summary?.finance.invoicesByStatus['PAID'] ?? 0,    color: '#4ADE80' },
                    { label: 'Sent',    value: summary?.finance.invoicesByStatus['SENT'] ?? 0,    color: '#60A5FA' },
                    { label: 'Overdue', value: summary?.finance.invoicesByStatus['OVERDUE'] ?? 0, color: '#F87171' },
                    { label: 'Draft',   value: summary?.finance.invoicesByStatus['DRAFT'] ?? 0,   color: '#94A3B8' },
                  ]}
                  size={110}
                  thickness={20}
                />
                <div className="mt-3 flex justify-between border-t border-cdy-navy-border pt-3 text-sm">
                  <span className="text-cdy-muted">Reserve balance</span>
                  <span className="font-mono font-medium text-cdy-white">
                    {summary?.finance.reserve?.currency ?? 'RWF'}{' '}
                    {Number(summary?.finance.reserve?.balance ?? 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* Row 3b — Compact Finance charts */}
        {!isLoading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Income by service */}
            <SectionCard
              title="Income by service — this month"
              action={
                <Link href="/finance" className="text-xs text-cdy-red hover:underline">
                  Finance →
                </Link>
              }
            >
              <div className="space-y-2">
                {(summary?.finance.charts?.incomeByService ?? []).slice(0, 5).map((item) => (
                  <div key={item.service} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: ceoServiceColor(item.service) }}
                    />
                    <span className="flex-1 truncate text-xs text-cdy-muted">{item.label}</span>
                    <span className="font-mono text-xs text-cdy-white">
                      RWF {Number(item.amount).toLocaleString()}
                    </span>
                    <span className="w-10 text-right text-xs text-cdy-dim">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
                {(summary?.finance.charts?.incomeByService ?? []).length === 0 && (
                  <p className="text-xs text-cdy-muted">No income this month</p>
                )}
              </div>
            </SectionCard>

            {/* Payment method — income vs expenses vs net */}
            <SectionCard title="Payment methods — income vs expenses">
              {/* Column headers */}
              <div className="mb-1 grid grid-cols-4 gap-1 border-b border-cdy-navy-border pb-1.5">
                {(['Method', 'In', 'Out', 'Net'] as const).map((h, i) => (
                  <span key={h} className={`text-xs text-cdy-dim ${i > 0 ? 'text-right' : ''}`}>
                    {h}
                  </span>
                ))}
              </div>
              {(summary?.finance.charts?.paymentMethodSummary ?? []).map((item) => (
                <div
                  key={item.method}
                  className="grid grid-cols-4 gap-1 border-b border-cdy-navy-border/50 py-1.5 last:border-0"
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-xs text-cdy-muted">{item.label}</span>
                  </div>
                  <span className="text-right font-mono text-xs text-green-400">
                    {item.income.amount > 0
                      ? `+${Number(item.income.amount).toLocaleString()}`
                      : '—'}
                  </span>
                  <span className="text-right font-mono text-xs text-red-400">
                    {item.expenses.amount > 0
                      ? `−${Number(item.expenses.amount).toLocaleString()}`
                      : '—'}
                  </span>
                  <span
                    className={`text-right font-mono text-xs font-semibold ${
                      item.net >= 0 ? 'text-cdy-white' : 'text-red-400'
                    }`}
                  >
                    {item.net >= 0 ? '+' : ''}{Number(item.net).toLocaleString()}
                  </span>
                </div>
              ))}
              {(summary?.finance.charts?.paymentMethodSummary ?? []).length === 0 && (
                <p className="py-4 text-center text-xs text-cdy-muted">No payment activity this month</p>
              )}
            </SectionCard>
          </div>
        )}

        {/* Row 4 — CRM */}
        <ErrorBoundary section="CRM & Sales Pipeline">
        <SectionCard
          title="CRM & Sales Pipeline"
          action={<Link href="/crm" className="text-xs text-cdy-red hover:underline">View CRM →</Link>}
        >
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Pipeline value',  value: `RWF${(Number(summary?.crm.pipelineValue ?? 0) / 1000).toFixed(0)}K` },
                  { label: 'Leads MTD',       value: summary?.crm.totalLeadsMTD ?? 0 },
                  { label: 'Closed Won MTD',  value: summary?.crm.closedWonMTD ?? 0 },
                  { label: 'Conversion rate', value: `${summary?.crm.conversionRate ?? 0}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-cdy-navy p-3">
                    <p className="text-xs text-cdy-muted">{m.label}</p>
                    <p className="mt-0.5 font-mono text-xl font-bold text-cdy-white">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline by stage */}
              <div className="space-y-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-cdy-muted">Pipeline by stage</p>
                {[
                  { stage: 'NEW',          label: 'New' },
                  { stage: 'CONTACTED',    label: 'Contacted' },
                  { stage: 'PROPOSAL_SENT', label: 'Proposal sent' },
                  { stage: 'NEGOTIATION',  label: 'Negotiation' },
                ].map((s) => {
                  const count = summary?.crm.leadsByStage[s.stage] ?? 0;
                  const total = Object.values(summary?.crm.leadsByStage ?? {}).reduce(
                    (a, b) => a + Number(b),
                    0,
                  );
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={s.stage} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-cdy-muted">{s.label}</span>
                        <span className="font-mono text-cdy-white">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-cdy-navy">
                        <div className="h-full rounded-full bg-cdy-red" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top agents */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-cdy-muted">Top agents — MTD</p>
                <div className="space-y-3">
                  {(summary?.crm.topAgents ?? []).slice(0, 3).map((agent, i) => {
                    const topValue = Number(
                      summary?.crm.topAgents[0]?._sum?.estimatedValue ?? 1,
                    );
                    const val = Number(agent._sum?.estimatedValue ?? 0);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : 'text-orange-700'}`}>
                          #{i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex justify-between text-xs">
                            <span className="truncate text-cdy-muted">{agent.assignedTo ?? '—'}</span>
                            <span className="font-mono text-cdy-white">RWF{val.toLocaleString()}</span>
                          </div>
                          <div className="h-1 rounded-full bg-cdy-navy">
                            <div className="h-full rounded-full bg-green-400"
                              style={{ width: `${Math.min(100, topValue > 0 ? (val / topValue) * 100 : 0)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
        </ErrorBoundary>

        {/* Row 5 — HR */}
        <ErrorBoundary section="Team & HR">
        <SectionCard
          title="Team & HR"
          action={<Link href="/hr" className="text-xs text-cdy-red hover:underline">View HR →</Link>}
        >
          {isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="grid grid-cols-2 items-center gap-4 lg:grid-cols-5">
              <div className="grid grid-cols-2 gap-3 lg:col-span-3">
                {[
                  { label: 'Total team',       value: summary?.hr.totalEmployees ?? 0, alert: false },
                  { label: 'Present today',    value: summary?.hr.presentToday ?? 0,   alert: false },
                  { label: 'On leave today',   value: summary?.hr.onLeaveToday ?? 0,   alert: false },
                  { label: 'Leave requests',   value: summary?.hr.pendingLeaveRequests ?? 0, alert: (summary?.hr.pendingLeaveRequests ?? 0) > 0 },
                  { label: 'Pending reviews',  value: summary?.hr.pendingPerformanceReviews ?? 0, alert: (summary?.hr.pendingPerformanceReviews ?? 0) > 0 },
                ].map((m) => (
                  <div key={m.label}
                    className={`rounded-lg p-3 ${m.alert ? 'border border-amber-800/50 bg-amber-900/20' : 'bg-cdy-navy'}`}>
                    <p className="text-xs text-cdy-muted">{m.label}</p>
                    <p className={`mt-0.5 font-mono text-xl font-bold ${m.alert ? 'text-amber-400' : 'text-cdy-white'}`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center lg:col-span-2">
                <GaugeChart value={attendanceRate} label="Attendance rate" />
                {(summary?.hr.pendingLeaveRequests ?? 0) > 0 && (
                  <Link href="/hr/leave" className="mt-2 text-xs text-cdy-red hover:underline">
                    Review {summary?.hr.pendingLeaveRequests} leave request{(summary?.hr.pendingLeaveRequests ?? 0) > 1 ? 's' : ''} →
                  </Link>
                )}
              </div>
            </div>
          )}
        </SectionCard>
        </ErrorBoundary>

        {/* Row 6 — Projects */}
        <ErrorBoundary section="Active Projects">
        <SectionCard
          title="Active Projects"
          action={<Link href="/projects" className="text-xs text-cdy-red hover:underline">View Projects →</Link>}
        >
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Active projects',    value: summary?.projects.activeProjects ?? 0, alert: false },
                  { label: 'Overdue tasks',      value: summary?.projects.overdueTasks ?? 0,   alert: (summary?.projects.overdueTasks ?? 0) > 0 },
                  { label: 'Blocked tasks',      value: summary?.projects.blockedTasks ?? 0,   alert: (summary?.projects.blockedTasks ?? 0) > 0 },
                ].map((m) => (
                  <div key={m.label}
                    className={`rounded-lg p-3 ${m.alert ? 'border border-red-800/50 bg-red-900/20' : 'bg-cdy-navy'}`}>
                    <p className="text-xs text-cdy-muted">{m.label}</p>
                    <p className={`mt-0.5 font-mono text-xl font-bold ${m.alert ? 'text-red-400' : 'text-cdy-white'}`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 lg:col-span-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-cdy-muted">Recent projects</p>
                {(summary?.projects.recentProjects ?? []).slice(0, 5).map((p) => {
                  const total = p._count.tasks;
                  const pct = total > 0 ? Math.min(100, Math.round((total * 0.6))) : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="truncate font-medium text-cdy-white">{p.name}</span>
                          <span className="ml-2 flex-shrink-0 text-cdy-muted">{p.client?.companyName ?? ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-cdy-navy">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-cdy-red'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
        </ErrorBoundary>

        {/* Row 7 — Service lines */}
        <div id="service-lines">
        <SectionCard title="Service Lines">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                { label: 'Marketing',   value: `${summary?.services.marketingClients ?? 0} clients`,     href: '/marketing',  color: 'text-pink-400' },
                { label: 'Software',    value: `${summary?.services.softwareProjects ?? 0} projects`,    href: '/software',   color: 'text-blue-400' },
                { label: 'Branding',    value: `${summary?.services.brandingProjects ?? 0} active`,      href: '/branding',   color: 'text-purple-400' },
                { label: 'Influencer',  value: `${summary?.services.activeCampaigns ?? 0} campaigns`,    href: '/influencer', color: 'text-amber-400' },
                { label: 'Sales',       value: `${summary?.services.salesCampaigns ?? 0} campaigns`,     href: '/sales',      color: 'text-green-400' },
                { label: 'Products',    value: `${summary?.services.activeSubscriptions ?? 0} subs`,     href: '/finance',    color: 'text-cyan-400' },
              ].map((s) => (
                <Link key={s.label} href={s.href}
                  className="group flex items-center justify-between rounded-lg bg-cdy-navy p-4 transition-colors hover:bg-cdy-navy-light">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-cdy-muted">{s.label}</p>
                    <p className={`mt-0.5 font-mono text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <span className="text-cdy-muted transition-colors group-hover:text-cdy-red">→</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        </div>

        {/* Row 8 — Ventures */}
        {(summary?.ventures.total ?? 0) > 0 && (
          <ErrorBoundary section="Ventures">
          <SectionCard
            title="Ventures (this month)"
            action={<Link href="/finance/ventures" className="text-xs text-cdy-red hover:underline">View ventures →</Link>}
          >
            <div className="mb-4 grid grid-cols-3 gap-4">
                {[
                { label: 'Total income',   value: `RWF${(summary?.ventures.totalIncome ?? 0).toLocaleString()}`,   color: 'text-green-400' },
                { label: 'Total expenses', value: `RWF${(summary?.ventures.totalExpenses ?? 0).toLocaleString()}`, color: 'text-red-400' },
                { label: 'Net profit',     value: `RWF${(summary?.ventures.totalNet ?? 0).toLocaleString()}`,
                  color: (summary?.ventures.totalNet ?? 0) >= 0 ? 'text-cdy-white' : 'text-red-400' },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-cdy-navy p-3">
                  <p className="text-xs text-cdy-muted">{m.label}</p>
                  <p className={`mt-0.5 font-mono text-xl font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(summary?.ventures.list ?? []).map((v) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: `#${v.color}` }} />
                  <span className="flex-1 text-cdy-muted">{v.name}</span>
                  <span className="font-mono text-xs text-green-400">+RWF{v.income.toLocaleString()}</span>
                  <span className="font-mono text-xs text-red-400">−RWF{v.expenses.toLocaleString()}</span>
                  <span className={`w-20 text-right font-mono text-xs font-bold ${v.net >= 0 ? 'text-cdy-white' : 'text-red-400'}`}>
                    RWF{v.net.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
          </ErrorBoundary>
        )}

        {/* Row 9 — Quick actions */}
        <SectionCard title="Quick actions">
          <div className="flex flex-wrap gap-3">
            {[
              { label: '💰 Review commissions', href: '/finance/commissions' },
              { label: '📋 Approve leave',       href: '/hr/leave' },
              { label: '📊 View P&L report',     href: '/finance/reports' },
              { label: '🏗 Budget requests',     href: '/finance/budget' },
              { label: '📈 Full reports',        href: '/finance/reports' },
              { label: '⚙ IT & permissions',    href: '/it' },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                className="rounded-lg border border-cdy-navy-border px-4 py-2 text-sm text-cdy-muted transition-colors hover:border-cdy-red hover:text-cdy-red">
                {a.label}
              </Link>
            ))}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
