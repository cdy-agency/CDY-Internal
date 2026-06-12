'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, addMonths, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { PipelineStage } from '@cdy/shared';
import {
  useCrmSummary,
  useMonthlyTargets,
  useSetTarget,
  useSalesAgents,
  currentMonthParam,
} from '@/hooks/useCrm';
import { formatCurrency } from '@/lib/utils';
import { MetricCard } from '@/components/finance/MetricCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { Kanban, Trophy, Users, TrendingUp } from 'lucide-react';

function progressBarColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-cdy-red';
}

const OPEN_STAGES: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATION,
];

interface TeamDashboardViewProps {
  month: string;
  onMonthChange: (month: string) => void;
}

export function TeamDashboardView({
  month,
  onMonthChange,
}: TeamDashboardViewProps): JSX.Element {
  const { data: summary, isLoading: summaryLoading } = useCrmSummary();
  const { data: targets, isLoading: targetsLoading } = useMonthlyTargets(month);
  const { data: agents } = useSalesAgents();
  const setTarget = useSetTarget();
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [revenueTarget, setRevenueTarget] = useState('');
  const [dealsTarget, setDealsTarget] = useState('');

  const monthDate = new Date(`${month}-01`);
  const isCurrentMonth = month === currentMonthParam();

  async function saveTarget(): Promise<void> {
    if (!selectedAgent || !revenueTarget || !dealsTarget) return;
    try {
      await setTarget.mutateAsync({
        agentId: selectedAgent,
        month,
        revenueTarget: Number(revenueTarget),
        dealsTarget: Number(dealsTarget),
      });
      toast.success('Target saved');
      setTargetModalOpen(false);
      setRevenueTarget('');
      setDealsTarget('');
    } catch {
      /* interceptor */
    }
  }

  const sortedTargets = [...(targets ?? [])].sort(
    (a, b) => b.actual.revenueWon - a.actual.revenueWon,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">Team Overview</h1>
          <p className="text-sm text-cdy-muted">Sales performance across all agents</p>
        </div>
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
          <PermissionGate feature="crm.reports" action="write">
            <Button
              size="sm"
              className="bg-cdy-red hover:bg-cdy-red/90"
              onClick={() => setTargetModalOpen(true)}
            >
              Set Targets
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Open Leads"
          value={String(summary?.totalInPipeline ?? 0)}
          delta={0}
          deltaLabel=""
          icon={Kanban}
          iconColor="bg-amber-500/10 text-[var(--cdy-warning)]"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(summary?.totalPipelineValue ?? 0)}
          delta={0}
          deltaLabel=""
          icon={TrendingUp}
          iconColor="bg-emerald-500/10 text-[var(--cdy-success)]"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Closed Won MTD"
          value={String(summary?.totalClosedWonThisMonth ?? 0)}
          delta={0}
          deltaLabel=""
          icon={Trophy}
          iconColor="bg-emerald-500/10 text-[var(--cdy-success)]"
          isLoading={summaryLoading}
        />
        <MetricCard
          label="Conversion Rate"
          value={`${summary?.conversionRate ?? 0}%`}
          delta={0}
          deltaLabel=""
          icon={Users}
          iconColor="bg-purple-500/10 text-purple-400"
          isLoading={summaryLoading}
        />
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="mb-4 font-medium text-cdy-white">Agent leaderboard</h2>
        {targetsLoading && <p className="text-cdy-muted">Loading...</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-2 py-2">Rank</th>
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Deals Won</th>
                <th className="px-2 py-2">Revenue</th>
                <th className="px-2 py-2">vs Target</th>
                <th className="px-2 py-2">Commission</th>
              </tr>
            </thead>
            <tbody>
              {sortedTargets.map((row, idx) => (
                <tr key={row.agentId} className="border-b border-cdy-navy-border/50">
                  <td className="px-2 py-2 text-cdy-muted">{idx + 1}</td>
                  <td className="px-2 py-2 text-cdy-white">{row.agentName}</td>
                  <td className="px-2 py-2 text-cdy-white">{row.actual.dealsWon}</td>
                  <td className="px-2 py-2 text-cdy-white">
                    {formatCurrency(row.actual.revenueWon)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-cdy-navy">
                        <div
                          className={`h-full ${progressBarColor(row.revenueProgress)}`}
                          style={{
                            width: `${Math.min(row.revenueProgress, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-cdy-muted">{row.revenueProgress}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-cdy-muted">
                    {formatCurrency(row.commissionTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {summary && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 font-medium text-cdy-white">Pipeline health by stage</h2>
          <div className="space-y-3">
            {OPEN_STAGES.map((stage) => {
              const count = summary.leadsByStage[stage] ?? 0;
              const value = summary.pipelineValueByStage[stage] ?? 0;
              const openTotal = OPEN_STAGES.reduce(
                (sum, s) => sum + (summary.leadsByStage[s] ?? 0),
                0,
              );
              const pct = openTotal > 0 ? (count / openTotal) * 100 : 0;
              return (
                <Link key={stage} href={`/crm/leads?stage=${stage}`}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-cdy-muted">{stage.replace('_', ' ')}</span>
                    <span className="text-cdy-white">
                      {count} leads · {formatCurrency(value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full bg-cdy-red transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {targetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
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
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Deals target"
                value={dealsTarget}
                onChange={(e) => setDealsTarget(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setTargetModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={setTarget.isPending}
                onClick={() => void saveTarget()}
              >
                Set Target
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
