'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, addMonths, subMonths } from 'date-fns';
import { PipelineStage } from '@cdy/shared';
import {
  useAgentDashboard,
  useCrmSummary,
  useMonthlyTargets,
  useSalesAgents,
  useSetTarget,
  currentMonthParam,
} from '@/hooks/useCrm';
import { usePermissions } from '@/context/PermissionContext';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import {
  MetricHero,
  SectionCard,
  DonutChart,
  GaugeChart,
  QualityBadge,
  DataTable,
} from '@/components/dashboard';
import toast from 'react-hot-toast';

const OPEN_STAGES: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATION,
];

const STAGE_COLORS: Record<string, string> = {
  NEW: '#60A5FA',
  CONTACTED: '#FBBF24',
  PROPOSAL_SENT: '#C084FC',
  NEGOTIATION: '#F97316',
  CLOSED_WON: '#4ADE80',
  CLOSED_LOST: '#F87171',
};

// ─── Agent view ─────────────────────────────────────────────────────────────

function AgentView({ month }: { month: string }): JSX.Element {
  const { data, isLoading } = useAgentDashboard(month);
  const revenueProgress = data?.performance.revenueProgress ?? 0;
  const targetRevenue = data?.target ? Number(data.target.revenueTarget) : 0;

  const progressQuality =
    revenueProgress >= 80 ? { label: 'ON TRACK', variant: 'green' as const } :
    revenueProgress >= 50 ? { label: 'IN PROGRESS', variant: 'blue' as const } :
    { label: 'BEHIND', variant: 'amber' as const };

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.performance.revenueWon ?? 0)}
            label="Revenue won MTD"
            badge={targetRevenue > 0 ? progressQuality.label : undefined}
            badgeVariant={targetRevenue > 0 ? progressQuality.variant : undefined}
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(data?.performance.dealsWon ?? 0)}
            label="Deals closed"
            trendLabel={
              data?.target
                ? `${data.performance.dealsProgress ?? 0}% of target`
                : undefined
            }
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.pipeline.pipelineValue ?? 0)}
            label="Pipeline value"
            trendLabel={`${data?.pipeline.openLeads ?? 0} open leads`}
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(data?.commission.total ?? 0)}
            label="Commission earned"
            badge={
              (data?.commission.pending ?? 0) > 0 ? 'PENDING REVIEW' : undefined
            }
            badgeVariant="amber"
            isLoading={isLoading}
            size="md"
          />
        </SectionCard>
      </div>

      {/* Revenue vs target gauge + pipeline stages */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {targetRevenue > 0 && (
          <SectionCard title="Revenue vs target">
            <div className="flex items-center gap-6">
              <GaugeChart
                value={Math.min(revenueProgress, 100)}
                label="% of target"
              />
              <div className="space-y-2">
                <QualityBadge
                  label={progressQuality.label}
                  variant={progressQuality.variant}
                />
                <p className="text-sm text-cdy-muted">
                  {formatCurrency(data?.performance.revenueWon ?? 0)} of{' '}
                  {formatCurrency(targetRevenue)}
                </p>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Deals by stage">
          <div className="space-y-2.5">
            {OPEN_STAGES.map((stage) => {
              const count = 0; // pipeline counts not in agent dashboard
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-cdy-muted">
                      {stage.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${count}%`,
                        backgroundColor: STAGE_COLORS[stage] ?? '#C41E3A',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Commission breakdown */}
      {(data?.commission.records.length ?? 0) > 0 && (
        <SectionCard title="Commission breakdown">
          <DataTable
            columns={['Deal', 'Rate', 'Amount', 'Status']}
            rows={data!.commission.records.map((r) => [
              r.companyName,
              `${r.ratePercent}%`,
              formatCurrency(r.adjustedAmount ?? r.calculatedAmount),
              r.status,
            ])}
          />
        </SectionCard>
      )}

      {/* Overdue follow-ups */}
      {(data?.overdueItems.length ?? 0) > 0 && (
        <SectionCard title="Overdue follow-ups">
          <div className="space-y-2">
            {data!.overdueItems.map((item) => (
              <Link
                key={item.leadId}
                href={`/crm/leads/${item.leadId}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-cdy-navy"
              >
                <span className="font-medium text-cdy-white">
                  {item.companyName}
                </span>
                <span className="text-cdy-muted">
                  {item.nextAction} — due{' '}
                  {format(new Date(item.nextActionDate), 'MMM d')}
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Team / manager view ─────────────────────────────────────────────────────

function TeamView({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (m: string) => void;
}): JSX.Element {
  const { data: summary, isLoading: summaryLoading } = useCrmSummary();
  const { data: targets, isLoading: targetsLoading } = useMonthlyTargets(month);
  const { data: agents } = useSalesAgents();
  const setTarget = useSetTarget();
  const [targetOpen, setTargetOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [revTarget, setRevTarget] = useState('');
  const [dealsTarget, setDealsTarget] = useState('');

  const monthDate = new Date(`${month}-01`);
  const isCurrentMonth = month === currentMonthParam();

  const sortedTargets = [...(targets ?? [])].sort(
    (a, b) => b.actual.revenueWon - a.actual.revenueWon,
  );

  async function saveTarget(): Promise<void> {
    if (!selectedAgent || !revTarget || !dealsTarget) return;
    try {
      await setTarget.mutateAsync({
        agentId: selectedAgent,
        month,
        revenueTarget: Number(revTarget),
        dealsTarget: Number(dealsTarget),
      });
      toast.success('Target saved');
      setTargetOpen(false);
      setRevTarget('');
      setDealsTarget('');
    } catch {
      /* interceptor */
    }
  }

  const totalLeads = Object.values(summary?.leadsBySource ?? {}).reduce(
    (s, v) => s + v,
    0,
  );

  const sourceColors = [
    '#C41E3A', '#60A5FA', '#4ADE80', '#FBBF24',
    '#F97316', '#C084FC', '#F87171', '#94A3B8',
  ];

  const sourceSegments = Object.entries(summary?.leadsBySource ?? {})
    .filter(([, v]) => v > 0)
    .map(([source, count], i) => ({
      label: source.replace('_', ' '),
      value: count,
      color: sourceColors[i % sourceColors.length],
    }));

  return (
    <div className="space-y-6">
      {/* Month nav + Set Targets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onMonthChange(format(subMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            ←
          </Button>
          <span className="text-sm text-cdy-white">
            {format(monthDate, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isCurrentMonth}
            onClick={() =>
              onMonthChange(format(addMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            →
          </Button>
        </div>
        <PermissionGate feature="crm.reports" action="write">
          <Button
            size="sm"
            className="bg-cdy-red hover:bg-cdy-red/90"
            onClick={() => setTargetOpen(true)}
          >
            Set Targets
          </Button>
        </PermissionGate>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SectionCard>
          <MetricHero
            value={String(summary?.totalInPipeline ?? 0)}
            label="Total leads in pipeline"
            trendLabel="across all stages"
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={formatCurrency(summary?.totalPipelineValue ?? 0)}
            label="Pipeline value"
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={String(summary?.totalClosedWonThisMonth ?? 0)}
            label="Closed won MTD"
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
        <SectionCard>
          <MetricHero
            value={`${summary?.conversionRate ?? 0}%`}
            label="Conversion rate"
            isLoading={summaryLoading}
            size="md"
          />
        </SectionCard>
      </div>

      {/* Leaderboard + Leads by source */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Agent leaderboard">
          {targetsLoading ? (
            <p className="text-sm text-cdy-muted">Loading…</p>
          ) : (
            <div className="space-y-3">
              {sortedTargets.map((row, idx) => (
                <div key={row.agentId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-4 text-xs text-cdy-dim">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-cdy-white">
                        {row.agentName}
                      </span>
                    </span>
                    <span className="font-mono text-cdy-muted">
                      {formatCurrency(row.actual.revenueWon)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(row.revenueProgress, 100)}%`,
                        backgroundColor:
                          row.revenueProgress >= 80
                            ? '#4ADE80'
                            : row.revenueProgress >= 50
                            ? '#FBBF24'
                            : '#F87171',
                      }}
                    />
                  </div>
                  <p className="text-right text-xs text-cdy-dim">
                    {row.revenueProgress}% of target
                  </p>
                </div>
              ))}
              {sortedTargets.length === 0 && (
                <p className="text-sm text-cdy-muted">No targets set for this month.</p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Leads by source">
          {sourceSegments.length > 0 ? (
            <DonutChart segments={sourceSegments} size={120} thickness={22} />
          ) : (
            <p className="text-sm text-cdy-muted">No lead source data.</p>
          )}
        </SectionCard>
      </div>

      {/* Pipeline health */}
      {summary && (
        <SectionCard title="Pipeline by stage">
          <div className="space-y-3">
            {OPEN_STAGES.map((stage) => {
              const count = summary.leadsByStage[stage] ?? 0;
              const value = summary.pipelineValueByStage[stage] ?? 0;
              const openTotal = OPEN_STAGES.reduce(
                (s, st) => s + (summary.leadsByStage[st] ?? 0),
                0,
              );
              const pct = openTotal > 0 ? (count / openTotal) * 100 : 0;
              return (
                <Link key={stage} href={`/crm/leads?stage=${stage}`}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-cdy-muted">
                      {stage.replace('_', ' ')}
                    </span>
                    <span className="text-cdy-white">
                      {count} leads · {formatCurrency(value)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          STAGE_COLORS[stage] ?? '#C41E3A',
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Target modal */}
      {targetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">
              Set Monthly Targets — {format(monthDate, 'MMMM yyyy')}
            </h2>
            <div className="mt-4 space-y-3">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                <option value="">Select agent</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Revenue target"
                value={revTarget}
                onChange={(e) => setRevTarget(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Deals target"
                value={dealsTarget}
                onChange={(e) => setDealsTarget(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setTargetOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={setTarget.isPending}
                onClick={() => void saveTarget()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CrmOverviewPage(): JSX.Element {
  const { roleKey } = usePermissions();
  const isAgent = roleKey === 'SALES_AGENT';
  const [month, setMonth] = useState(currentMonthParam());
  const monthDate = new Date(`${month}-01`);
  const isCurrentMonth = month === currentMonthParam();

  if (isAgent) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            ←
          </Button>
          <span className="text-sm text-cdy-white">
            {format(monthDate, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isCurrentMonth}
            onClick={() =>
              setMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))
            }
          >
            →
          </Button>
        </div>
        <AgentView month={month} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <TeamView month={month} onMonthChange={setMonth} />
    </div>
  );
}
