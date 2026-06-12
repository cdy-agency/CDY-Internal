'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useProject, useProjectStatusReport } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';

function buildReportText(
  report: NonNullable<ReturnType<typeof useProjectStatusReport>['data']>,
): string {
  const lines = [
    'Project Status Report',
    `${report.project.name} — ${report.project.code}`,
    `Generated: ${format(parseISO(report.generatedAt), 'MMMM d, yyyy')}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `OVERALL PROGRESS                              ${report.progress.overall}%`,
    `${'█'.repeat(Math.round(report.progress.overall / 5))}${'░'.repeat(20 - Math.round(report.progress.overall / 5))}`,
    '',
    `STATUS: ${report.project.status}  ·  DUE: ${report.project.endDate ? format(parseISO(report.project.endDate), 'MMMM d, yyyy') : 'Ongoing'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'TASKS',
    `Done: ${report.progress.taskBreakdown.done}  ·  In Progress: ${report.progress.taskBreakdown.inProgress}  ·  Blocked: ${report.progress.taskBreakdown.blocked}  ·  To Do: ${report.progress.taskBreakdown.todo}`,
    '',
    'MILESTONES',
    ...report.milestones.map(
      (m) =>
        `${m.name}    ${m.status}    ${m.billingAmount != null ? `$${m.billingAmount}` : '—'}`,
    ),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'FINANCIALS',
    `Revenue invoiced:  $${report.financials.invoicedRevenue}    Collected: $${report.financials.collectedRevenue}`,
    `Total costs:       $${report.financials.totalCosts}    Gross margin: ${report.financials.grossMargin}%`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'BLOCKED ITEMS',
    ...(report.blockedItems.length
      ? report.blockedItems.map((b) => `⚠  ${b.title}`)
      : ['None']),
    '',
    'UPCOMING DEADLINES (next 14 days)',
    ...(report.upcomingDeadlines.length
      ? report.upcomingDeadlines.map(
          (d) =>
            `${d.dueDate ? format(parseISO(d.dueDate), 'MMM d') : '—'}  ${d.title}  ${d.priority}`,
        )
      : ['None']),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'RECENT ACTIVITY',
    ...report.recentActivity.map(
      (a) =>
        `${format(parseISO(a.createdAt), 'MMM d')}  ${a.summary}`,
    ),
  ];
  return lines.join('\n');
}

export default function ProjectStatusReportPage(): JSX.Element {
  const params = useParams();
  const projectId = String(params.id);
  const { data: project } = useProject(projectId);
  const { data: report, isLoading } = useProjectStatusReport(projectId);

  async function handleCopy(): Promise<void> {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildReportText(report));
      toast.success('Report copied to clipboard');
    } catch {
      toast.error('Could not copy report');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-cdy-muted hover:text-cdy-white"
          >
            ← Back to project
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-cdy-white">
            Status Report — {project?.name ?? '…'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void handleCopy()} disabled={!report}>
            Copy report text
          </Button>
          <Button variant="outline" disabled title="Coming in Sprint 17">
            Export PDF
          </Button>
        </div>
      </div>

      {isLoading || !report ? (
        <p className="text-sm text-cdy-muted">Generating report…</p>
      ) : (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6 font-mono text-sm text-cdy-white whitespace-pre-wrap">
          {buildReportText(report)}
        </div>
      )}
    </div>
  );
}
