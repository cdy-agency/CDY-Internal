'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import type { HandoverReport } from '@cdy/shared';
import { MilestoneStatus } from '@cdy/shared';
import {
  useGenerateHandoverReport,
  useHandoverReport,
  useProject,
} from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

function buildHandoverText(report: HandoverReport): string {
  const lines = [
    'PROJECT HANDOVER REPORT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `${report.project.code}  ·  ${report.project.name}`,
    report.client
      ? `Client: ${report.client.company} (${report.client.contact ?? '—'})`
      : '',
    `Service type: ${report.project.serviceType.replace(/_/g, ' ')}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'PROJECT SUMMARY',
    '',
    `Started: ${format(parseISO(report.project.startDate), 'MMMM d, yyyy')}`,
    report.project.completedAt
      ? `Completed: ${format(parseISO(report.project.completedAt), 'MMMM d, yyyy')}`
      : '',
    report.project.totalDuration != null
      ? `Duration: ${report.project.totalDuration} days`
      : '',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'DELIVERABLES COMPLETED',
    '',
    ...report.deliverables.milestones.flatMap((m) => [
      `${m.name}    ${m.status}    ${m.billingAmount != null ? formatCurrency(m.billingAmount) : '—'}`,
      ...m.tasks.map((t) => `  • ${t.title}`),
      '',
    ]),
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'APPROVED DELIVERABLES',
    '',
    ...report.deliverables.approvedDeliverables.map(
      (a) =>
        `  ${a.title}    Approved ${a.approvedAt ? format(parseISO(a.approvedAt), 'MMM d') : '—'}`,
    ),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'FINANCIAL SUMMARY',
    '',
    `Total invoiced:    ${formatCurrency(report.financials.totalInvoiced)}`,
    `Total collected:   ${formatCurrency(report.financials.totalCollected)}`,
    `Total costs:       ${formatCurrency(report.financials.totalCosts)}`,
    `Gross margin:      ${report.financials.grossMargin.toFixed(1)}%`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    'TEAM CONTRIBUTION',
    '',
    `Total hours: ${report.teamSummary.totalHours}h    Billable: ${report.teamSummary.billableHours}h`,
    `Team size: ${report.teamSummary.teamSize} members`,
  ];
  return lines.filter(Boolean).join('\n');
}

export default function HandoverReportPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.id);
  const { data: project } = useProject(projectId);
  const { data: report, isLoading, error } = useHandoverReport(projectId);
  const generateHandover = useGenerateHandoverReport();

  async function handleCopy(): Promise<void> {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildHandoverText(report));
      toast.success('Report copied to clipboard');
    } catch {
      toast.error('Could not copy report');
    }
  }

  async function handleGenerate(): Promise<void> {
    try {
      await generateHandover.mutateAsync(projectId);
      toast.success('Handover report generated');
      router.refresh();
    } catch {
      toast.error('Could not generate handover report');
    }
  }

  if (isLoading) {
    return <p className="text-sm text-cdy-muted">Loading handover report…</p>;
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Back to project
        </Link>
        <p className="text-sm text-cdy-muted">
          No handover report yet. Generate one from the project page.
        </p>
        <Button onClick={() => void handleGenerate()} disabled={generateHandover.isPending}>
          Generate Handover Report
        </Button>
      </div>
    );
  }

  const billablePct =
    report.teamSummary.totalHours > 0
      ? (
          (report.teamSummary.billableHours / report.teamSummary.totalHours) *
          100
        ).toFixed(1)
      : '0';

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
            Handover Report — {project?.name ?? report.project.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleCopy()}>
            Copy as text
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print / Export PDF
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6 font-mono text-sm text-cdy-white print:border-none print:bg-white print:text-black">
        <p className="text-lg font-bold">PROJECT HANDOVER REPORT</p>
        <p className="text-cdy-muted print:text-gray-600">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </p>

        <p className="mt-4">
          {report.project.code} · {report.project.name}
        </p>
        {report.client && (
          <p>
            Client: {report.client.company} ({report.client.contact ?? '—'})
          </p>
        )}
        <p className="capitalize">
          Service type: {report.project.serviceType.replace(/_/g, ' ')}
        </p>

        <p className="mt-6 font-bold">PROJECT SUMMARY</p>
        <p>
          Started:{' '}
          {format(parseISO(report.project.startDate), 'MMMM d, yyyy')}
        </p>
        {report.project.completedAt && (
          <p>
            Completed:{' '}
            {format(parseISO(report.project.completedAt), 'MMMM d, yyyy')}
          </p>
        )}
        {report.project.totalDuration != null && (
          <p>Duration: {report.project.totalDuration} days</p>
        )}

        <p className="mt-6 font-bold">DELIVERABLES COMPLETED</p>
        {report.deliverables.milestones.map((m) => (
          <div key={m.name} className="mt-3">
            <p>
              {m.name}{' '}
              {m.status === MilestoneStatus.INVOICED ? '✅ Invoiced' : m.status}{' '}
              {m.billingAmount != null
                ? formatCurrency(m.billingAmount)
                : ''}
            </p>
            <ul className="ml-4 list-disc text-cdy-muted print:text-gray-700">
              {m.tasks.map((t) => (
                <li key={t.title}>{t.title}</li>
              ))}
            </ul>
          </div>
        ))}

        <p className="mt-6 font-bold">APPROVED DELIVERABLES</p>
        <ul className="ml-4 list-none">
          {report.deliverables.approvedDeliverables.map((a) => (
            <li key={a.title}>
              {a.title} — Approved{' '}
              {a.approvedAt
                ? format(parseISO(a.approvedAt), 'MMM d')
                : '—'}
            </li>
          ))}
        </ul>

        <p className="mt-6 font-bold">FINANCIAL SUMMARY</p>
        <p>Total invoiced: {formatCurrency(report.financials.totalInvoiced)}</p>
        <p>
          Total collected: {formatCurrency(report.financials.totalCollected)}
        </p>
        <p>Total costs: {formatCurrency(report.financials.totalCosts)}</p>
        <p>Gross margin: {report.financials.grossMargin.toFixed(1)}%</p>

        <p className="mt-6 font-bold">TEAM CONTRIBUTION</p>
        <p>
          Total hours: {report.teamSummary.totalHours}h · Billable:{' '}
          {report.teamSummary.billableHours}h ({billablePct}%)
        </p>
        <p>Team size: {report.teamSummary.teamSize} members</p>

        {report.notes && (
          <>
            <p className="mt-6 font-bold">NOTES</p>
            <p className="whitespace-pre-wrap text-cdy-muted print:text-gray-700">
              {report.notes}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
