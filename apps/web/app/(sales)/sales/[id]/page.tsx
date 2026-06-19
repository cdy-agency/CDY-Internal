'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSalesCampaign,
  useCampaignLogs,
  useCampaignReports,
  useCompleteSalesCampaign,
  useDeployAgent,
  useGenerateWeeklyReport,
} from '@/hooks/useSales';
import type {
  SalesAgentWithLogs,
  DailyActivityLogRecord,
  WeeklyReportRecord,
} from '@cdy/shared';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-900/30 text-green-400 border border-green-800' },
  COMPLETED: { label: 'Complete', className: 'bg-blue-900/30 text-blue-400 border border-blue-800' },
  ON_HOLD: { label: 'On Hold', className: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-900/30 text-cdy-red border border-red-800' },
};

function ProgressBar({ actual, target, label }: { actual: number; target: number | null; label: string }) {
  if (!target) return null;
  const pct = Math.min(100, Math.round((actual / target) * 100));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-cdy-red';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-cdy-muted">{label}</span>
        <span className="text-cdy-white">
          {actual.toLocaleString()} / {target.toLocaleString()}
          <span className="ml-2 text-cdy-muted text-xs">{pct}%</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-cdy-navy">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: SalesAgentWithLogs }) {
  const [expanded, setExpanded] = useState(false);

  const totals = agent.dailyLogs.reduce(
    (acc, l) => ({ v: acc.v + l.visitsCount, l: acc.l + l.leadsCount, s: acc.s + l.salesCount }),
    { v: 0, l: 0, s: 0 },
  );
  const days = agent.dailyLogs.length;
  const avgVisits = days > 0 ? (totals.v / days).toFixed(1) : '—';

  const lastLog = agent.dailyLogs[0];
  const lastDate = lastLog ? new Date(lastLog.date) : null;
  const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;
  const lastStr = daysSince === null ? '—' : daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30"
        onClick={() => setExpanded((x) => !x)}
      >
        <td className="px-4 py-3 text-cdy-white font-medium">
          <span className="flex items-center gap-2">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-cdy-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-cdy-muted" />}
            Agent #{agent.employeeId.slice(-6)}
          </span>
        </td>
        <td className="px-4 py-3 text-cdy-muted text-sm">{agent.territory ?? '—'}</td>
        <td className="px-4 py-3 text-right text-cdy-white">{totals.v}</td>
        <td className="px-4 py-3 text-right text-cdy-white">{totals.l}</td>
        <td className="px-4 py-3 text-right text-cdy-white">{totals.s}</td>
        <td className="px-4 py-3 text-cdy-muted text-sm">{lastStr}</td>
        <td className="px-4 py-3 text-right text-cdy-muted text-sm">{avgVisits}v/day</td>
      </tr>
      {expanded && agent.dailyLogs.map((log) => (
        <tr key={log.id} className="border-b border-cdy-navy-border/30 bg-cdy-navy/20 text-xs">
          <td className="pl-10 pr-4 py-2 text-cdy-muted">{new Date(log.date).toLocaleDateString()}</td>
          <td className="px-4 py-2 text-cdy-muted" />
          <td className="px-4 py-2 text-right text-cdy-muted">{log.visitsCount}</td>
          <td className="px-4 py-2 text-right text-cdy-muted">{log.leadsCount}</td>
          <td className="px-4 py-2 text-right text-cdy-muted">{log.salesCount}</td>
          <td className="px-4 py-2 text-cdy-muted">{log.notes ?? ''}</td>
          <td className="px-4 py-2 text-cdy-muted" />
        </tr>
      ))}
    </>
  );
}

function DeployAgentDrawer({ open, campaignId, onClose }: { open: boolean; campaignId: string; onClose: () => void }) {
  const deploy = useDeployAgent(campaignId);
  const [employeeId, setEmployeeId] = useState('');
  const [territory, setTerritory] = useState('');
  const [visitTarget, setVisitTarget] = useState('');
  const [leadTarget, setLeadTarget] = useState('');
  const [salesTarget, setSalesTarget] = useState('');
  const [results, setResults] = useState<{ id: string; firstName: string; lastName: string; jobTitle: string | null }[]>([]);
  const [query, setQuery] = useState('');

  async function search(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/proxy/hr/employees?search=${encodeURIComponent(q)}&limit=10`, {
        credentials: 'include',
      });
      const data = await res.json();
      setResults(data?.data?.data ?? []);
    } catch { setResults([]); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) return;
    await deploy.mutateAsync({
      employeeId,
      territory: territory || undefined,
      visitTarget: visitTarget ? Number(visitTarget) : undefined,
      leadTarget: leadTarget ? Number(leadTarget) : undefined,
      salesTarget: salesTarget ? Number(salesTarget) : undefined,
    });
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-y-auto bg-cdy-navy-light shadow-xl">
        <div className="border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">Deploy Field Agent</h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          <div className="space-y-1">
            <Label className="text-cdy-muted">HR Employee</Label>
            <div className="relative">
              <Input value={query} onChange={(e) => void search(e.target.value)}
                placeholder="Search HR employees..."
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
              {results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light shadow-lg">
                  {results.map((emp) => (
                    <button key={emp.id} type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-cdy-white hover:bg-cdy-navy"
                      onClick={() => { setEmployeeId(emp.id); setQuery(`${emp.firstName} ${emp.lastName}`); setResults([]); }}>
                      {emp.firstName} {emp.lastName}
                      {emp.jobTitle && <span className="ml-2 text-xs text-cdy-muted">— {emp.jobTitle}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Territory (optional)</Label>
            <Input value={territory} onChange={(e) => setTerritory(e.target.value)}
              placeholder="Agent's area"
              className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-cdy-muted text-xs">Daily visits</Label>
              <Input type="number" min="0" value={visitTarget} onChange={(e) => setVisitTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted text-xs">Daily leads</Label>
              <Input type="number" min="0" value={leadTarget} onChange={(e) => setLeadTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted text-xs">Daily sales</Label>
              <Input type="number" min="0" value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-cdy-muted">Cancel</Button>
            <Button type="submit" disabled={!employeeId || deploy.isPending} className="bg-cdy-red text-white hover:bg-cdy-red/90">
              {deploy.isPending ? 'Deploying...' : 'Deploy Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateReportDrawer({ open, campaignId, onClose, existingWeeks }: {
  open: boolean; campaignId: string; onClose: () => void; existingWeeks: number[];
}) {
  const generate = useGenerateWeeklyReport(campaignId);
  const [weekNumber, setWeekNumber] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [highlights, setHighlights] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await generate.mutateAsync({
      weekNumber: Number(weekNumber),
      weekStart,
      highlights: highlights || undefined,
      challenges: challenges || undefined,
      nextWeekPlan: nextWeekPlan || undefined,
    });
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-y-auto bg-cdy-navy-light shadow-xl">
        <div className="border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">Generate Weekly Report</h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-cdy-muted">Week number</Label>
              <Input type="number" min="1" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} required
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted">Week start (Monday)</Label>
              <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Highlights</Label>
            <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={3}
              placeholder="Key wins this week..."
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Challenges</Label>
            <textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} rows={3}
              placeholder="Key blockers..."
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Next week plan</Label>
            <textarea value={nextWeekPlan} onChange={(e) => setNextWeekPlan(e.target.value)} rows={3}
              placeholder="Focus areas for next week..."
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-cdy-muted">Cancel</Button>
            <Button type="submit" disabled={generate.isPending} className="bg-cdy-red text-white hover:bg-cdy-red/90">
              {generate.isPending ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WeeklyReportView({ report, campaignName, clientName, onClose }: {
  report: WeeklyReportRecord; campaignName: string; clientName: string; onClose: () => void;
}) {
  const [highlights, setHighlights] = useState(report.highlights ?? '');
  const [challenges, setChallenges] = useState(report.challenges ?? '');
  const [nextWeekPlan, setNextWeekPlan] = useState(report.nextWeekPlan ?? '');
  const save = useGenerateWeeklyReport(report.campaignId);

  useEffect(() => {
    setHighlights(report.highlights ?? '');
    setChallenges(report.challenges ?? '');
    setNextWeekPlan(report.nextWeekPlan ?? '');
  }, [report]);

  async function handleSave() {
    await save.mutateAsync({
      weekNumber: report.weekNumber,
      weekStart: report.weekStart,
      highlights: highlights || undefined,
      challenges: challenges || undefined,
      nextWeekPlan: nextWeekPlan || undefined,
    });
  }

  function copyForClient() {
    const start = new Date(report.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const end = new Date(report.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = [
      `WEEKLY SALES REPORT — WEEK ${report.weekNumber}`,
      `${campaignName} | ${start}–${end}`,
      '',
      'RESULTS THIS WEEK',
      `Visits:  ${report.totalVisits}`,
      `Leads:   ${report.totalLeads}`,
      `Sales:   ${report.totalSales}`,
      report.totalSalesAmount ? `Revenue: $${Number(report.totalSalesAmount).toLocaleString()}` : '',
      `Active agents: ${report.activeAgents}`,
      '',
      highlights ? `HIGHLIGHTS\n${highlights}` : '',
      challenges ? `CHALLENGES\n${challenges}` : '',
      nextWeekPlan ? `NEXT WEEK\n${nextWeekPlan}` : '',
    ].filter(Boolean).join('\n');

    void navigator.clipboard.writeText(text);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-cdy-navy">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button type="button" onClick={onClose}
          className="mb-6 flex items-center gap-2 text-sm text-cdy-muted hover:text-cdy-white">
          <ArrowLeft className="h-4 w-4" /> Back to campaign
        </button>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-cdy-white">Weekly Report — Week {report.weekNumber}</h1>
            <p className="text-cdy-muted">{campaignName} · {clientName}</p>
            <p className="text-sm text-cdy-muted">
              {new Date(report.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} –{' '}
              {new Date(report.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-cdy-muted">This Week's Results</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Visits', value: report.totalVisits },
                { label: 'Leads', value: report.totalLeads },
                { label: 'Sales', value: report.totalSales },
                { label: 'Agents', value: report.activeAgents },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-cdy-white">{stat.value}</p>
                  <p className="text-xs text-cdy-muted">{stat.label}</p>
                </div>
              ))}
            </div>
            {report.totalSalesAmount && (
              <p className="text-center text-sm text-cdy-muted">
                Revenue: <span className="font-semibold text-cdy-white">${Number(report.totalSalesAmount).toLocaleString()}</span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            {[
              { label: 'Highlights', value: highlights, setter: setHighlights, placeholder: 'Key wins this week...' },
              { label: 'Challenges', value: challenges, setter: setChallenges, placeholder: 'Key blockers...' },
              { label: 'Next Week Plan', value: nextWeekPlan, setter: setNextWeekPlan, placeholder: 'What the team plans to focus on...' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-cdy-muted">{label}</Label>
                <textarea value={value} onChange={(e) => setter(e.target.value)} rows={4}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white" />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => void handleSave()} disabled={save.isPending}
              className="bg-cdy-red text-white hover:bg-cdy-red/90">
              {save.isPending ? 'Saving...' : 'Save report'}
            </Button>
            <Button variant="ghost" onClick={copyForClient}
              className="gap-2 border border-cdy-navy-border text-cdy-muted hover:text-cdy-white">
              <Copy className="h-4 w-4" /> Copy for client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useSalesCampaign(id);
  const { data: logs } = useCampaignLogs(id);
  const { data: reports } = useCampaignReports(id);
  const complete = useCompleteSalesCampaign(id);

  const [deployOpen, setDeployOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [viewReport, setViewReport] = useState<WeeklyReportRecord | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!campaign) return null;

  const cfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG['ACTIVE'];

  const campaignTotals = (logs ?? []).reduce(
    (acc, l) => ({ v: acc.v + l.visitsCount, l: acc.l + l.leadsCount, s: acc.s + l.salesCount }),
    { v: 0, l: 0, s: 0 },
  );

  const filteredLogs: DailyActivityLogRecord[] = agentFilter
    ? (logs ?? []).filter((l) => l.employeeId === agentFilter)
    : (logs ?? []).slice(0, 30);

  const existingWeeks = (reports ?? []).map((r) => r.weekNumber);

  if (viewReport) {
    return (
      <WeeklyReportView
        report={viewReport}
        campaignName={campaign.name}
        clientName={campaign.client.companyName}
        onClose={() => setViewReport(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-cdy-muted hover:text-cdy-white">
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-cdy-white">{campaign.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs ${cfg.className}`}>{cfg.label}</span>
          </div>
          <p className="text-cdy-muted">{campaign.client.companyName}</p>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-cdy-muted">
            {campaign.productService && <span>Product: {campaign.productService}</span>}
            {campaign.territory && <span>Territory: {campaign.territory}</span>}
            <span>{new Date(campaign.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === 'ACTIVE' && (
            <>
              <Button onClick={() => setDeployOpen(true)} variant="ghost"
                className="border border-cdy-navy-border text-cdy-muted hover:text-cdy-white">
                <Plus className="mr-1.5 h-4 w-4" /> Deploy Agent
              </Button>
              <Button onClick={() => setReportOpen(true)} variant="ghost"
                className="border border-cdy-navy-border text-cdy-muted hover:text-cdy-white">
                Generate Report
              </Button>
              <Button onClick={() => setCompleteConfirm(true)}
                className="bg-cdy-red text-white hover:bg-cdy-red/90">
                Mark Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      {(campaign.visitTarget || campaign.leadTarget || campaign.salesTarget) && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 space-y-4">
          <h2 className="text-sm font-semibold text-cdy-white">Campaign Progress</h2>
          <ProgressBar actual={campaignTotals.v} target={campaign.visitTarget} label="Visits" />
          <ProgressBar actual={campaignTotals.l} target={campaign.leadTarget} label="Leads" />
          <ProgressBar actual={campaignTotals.s} target={campaign.salesTarget} label="Sales" />
        </div>
      )}

      {/* Agent table */}
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <div className="flex items-center gap-2 border-b border-cdy-navy-border px-6 py-4">
          <Users className="h-4 w-4 text-cdy-muted" />
          <h2 className="text-sm font-semibold text-cdy-white">Field Agents ({campaign.agents.length})</h2>
        </div>
        {campaign.agents.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-cdy-muted">No agents deployed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-xs text-cdy-muted">
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3 text-right">Visits</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3">Last log</th>
                  <th className="px-4 py-3 text-right">Avg/day</th>
                </tr>
              </thead>
              <tbody>
                {campaign.agents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily logs */}
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <div className="flex flex-col gap-3 border-b border-cdy-navy-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-cdy-white">Daily Logs</h2>
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white">
            <option value="">All agents</option>
            {campaign.agents.map((a) => (
              <option key={a.id} value={a.employeeId}>Agent #{a.employeeId.slice(-6)}</option>
            ))}
          </select>
        </div>
        {filteredLogs.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-cdy-muted">No logs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-xs text-cdy-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3 text-right">Visits</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                    <td className="px-4 py-3 text-cdy-white">
                      {new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">#{log.employeeId.slice(-6)}</td>
                    <td className="px-4 py-3 text-right text-cdy-white">{log.visitsCount}</td>
                    <td className="px-4 py-3 text-right text-cdy-white">{log.leadsCount}</td>
                    <td className="px-4 py-3 text-right text-cdy-white">{log.salesCount}</td>
                    <td className="px-4 py-3 text-right text-cdy-muted">
                      {log.salesAmount ? `$${Number(log.salesAmount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted max-w-xs truncate">{log.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weekly reports */}
      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <div className="border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-sm font-semibold text-cdy-white">Weekly Reports</h2>
        </div>
        {!reports?.length ? (
          <p className="px-6 py-8 text-center text-sm text-cdy-muted">No reports generated yet.</p>
        ) : (
          <div className="divide-y divide-cdy-navy-border">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-cdy-white">
                    Week {r.weekNumber}
                    <span className="ml-2 text-xs text-cdy-muted">
                      ({new Date(r.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}–
                      {new Date(r.weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                    </span>
                  </p>
                  <p className="text-xs text-cdy-muted">
                    {r.totalVisits}v · {r.totalLeads}l · {r.totalSales}s · {r.activeAgents} agents
                  </p>
                </div>
                <Button size="sm" variant="ghost"
                  className="border border-cdy-navy-border text-cdy-muted hover:text-cdy-white"
                  onClick={() => setViewReport(r)}>
                  View
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete confirm */}
      {completeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 space-y-4">
            <h3 className="text-base font-semibold text-cdy-white">Mark Campaign Complete?</h3>
            <p className="text-sm text-cdy-muted">
              Finance Manager will be notified for final billing. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCompleteConfirm(false)} className="text-cdy-muted">Cancel</Button>
              <Button
                disabled={complete.isPending}
                className="bg-cdy-red text-white hover:bg-cdy-red/90"
                onClick={async () => {
                  await complete.mutateAsync();
                  setCompleteConfirm(false);
                }}
              >
                {complete.isPending ? 'Completing...' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <DeployAgentDrawer open={deployOpen} campaignId={id} onClose={() => setDeployOpen(false)} />
      <GenerateReportDrawer
        open={reportOpen}
        campaignId={id}
        onClose={() => setReportOpen(false)}
        existingWeeks={existingWeeks}
      />
    </div>
  );
}
