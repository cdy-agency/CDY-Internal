'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { BarChart3, FileText, Receipt, TrendingUp } from 'lucide-react';
import { usePlReport, useAgeingReport, useExpenseReport } from '@/hooks/useReports';
import { buildPlPresets, currentMonthKey } from '@/lib/reportDates';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

const presets = buildPlPresets();
const defaultPreset = presets[0];

export default function ReportsLandingPage(): JSX.Element {
  const month = currentMonthKey();
  const { data: pl } = usePlReport({
    from: defaultPreset.from,
    to: defaultPreset.to,
  });
  const { data: ageing } = useAgeingReport({});
  const { data: expenses } = useExpenseReport({ month });

  async function downloadPl(): Promise<void> {
    try {
      await downloadReportPdf(
        '/reports/pl/pdf',
        `CDY-PL-Report-${format(new Date(), 'MMM-yyyy')}.pdf`,
        { from: defaultPreset.from, to: defaultPreset.to },
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  async function downloadAgeing(): Promise<void> {
    try {
      await downloadReportPdf(
        '/reports/ageing/pdf',
        `CDY-Ageing-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        {},
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  async function downloadExpenses(): Promise<void> {
    try {
      await downloadReportPdf(
        '/reports/expenses/pdf',
        `CDY-Expenses-Report-${month}.pdf`,
        { month },
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">Reports</h1>
        <p className="mt-1 text-sm text-cdy-muted">
          Financial intelligence for CDY
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReportCard
          icon={BarChart3}
          iconClass="bg-blue-500/10 text-[var(--cdy-info)]"
          title="Profit & Loss"
          description="Revenue, costs, and net profit for any period"
          stat={
            pl
              ? `Net profit: ${formatCurrency(pl.netProfit)}`
              : 'Loading...'
          }
          viewHref="/finance/reports/pl"
          onDownload={downloadPl}
        />
        <ReportCard
          icon={FileText}
          iconClass="bg-amber-500/10 text-[var(--cdy-warning)]"
          title="Invoice Ageing"
          description="Outstanding invoices grouped by how long they are overdue"
          stat={
            ageing
              ? `Total outstanding: ${formatCurrency(ageing.totalOutstanding)}`
              : 'Loading...'
          }
          viewHref="/finance/reports/ageing"
          onDownload={downloadAgeing}
        />
        <ReportCard
          icon={Receipt}
          iconClass="bg-purple-500/10 text-purple-400"
          title="Expense Summary"
          description="Monthly spending breakdown by category"
          stat={
            expenses
              ? `This month: ${formatCurrency(expenses.totalAmount)}`
              : 'Loading...'
          }
          viewHref="/finance/reports/expenses"
          onDownload={downloadExpenses}
        />
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cdy-navy text-cdy-muted">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-medium text-cdy-white">Cash Flow Forecast</h3>
          <p className="mt-1 text-sm text-cdy-muted">
            90-day projected cash position
          </p>
          <span className="mt-3 inline-block rounded-full border border-cdy-navy-border bg-cdy-navy px-3 py-1 text-xs text-cdy-muted">
            Coming in Sprint 5
          </span>
          <Button variant="outline" className="mt-4" disabled>
            Coming Soon
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  iconClass,
  title,
  description,
  stat,
  viewHref,
  onDownload,
}: {
  icon: typeof BarChart3;
  iconClass: string;
  title: string;
  description: string;
  stat: string;
  viewHref: string;
  onDownload: () => void;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-cdy-white">{title}</h3>
      <p className="mt-1 text-sm text-cdy-muted">{description}</p>
      <p className="mt-3 text-sm text-cdy-white">{stat}</p>
      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link href={viewHref}>View Report</Link>
        </Button>
        <Button variant="outline" onClick={onDownload}>
          Download PDF
        </Button>
      </div>
    </div>
  );
}
