'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  BarChart3,
  FileText,
  Receipt,
  TrendingUp,
  Scale,
  Landmark,
} from 'lucide-react';
import {
  usePlReport,
  useAgeingReport,
  useExpenseReport,
  useCashFlowReport,
  useBalanceSheetReport,
} from '@/hooks/useReports';
import { useTaxReport } from '@/hooks/useTax';
import { useFinanceSummary } from '@/hooks/useFinanceSummary';
import { buildPlPresets, currentMonthKey } from '@/lib/reportDates';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { FeatureReadGate } from '@/components/FeatureReadGate';

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
  const { data: cashFlow } = useCashFlowReport({ weeks: 13 });
  const { data: balanceSheet } = useBalanceSheetReport();
  const { data: summary } = useFinanceSummary();
  const taxFrom = defaultPreset.from;
  const taxTo = defaultPreset.to;
  const { data: taxReport } = useTaxReport({ from: taxFrom, to: taxTo });

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

  async function downloadCashFlow(): Promise<void> {
    try {
      await downloadReportPdf(
        '/reports/cashflow/pdf?weeks=13',
        `CDY-CashFlow-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        {},
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  async function downloadTax(): Promise<void> {
    try {
      await downloadReportPdf(
        '/tax/report/pdf',
        `CDY-Tax-Report-${format(new Date(), 'MMM-yyyy')}.pdf`,
        { from: taxFrom, to: taxTo },
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  async function downloadBalanceSheet(): Promise<void> {
    try {
      await downloadReportPdf(
        '/reports/balance-sheet/pdf',
        `CDY-BalanceSheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        {},
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  return (
    <FeatureReadGate feature="finance.reports" featureName="Financial Reports">
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">Reports</h1>
        <p className="mt-1 text-sm text-cdy-muted">
          Financial intelligence for CDY
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <ReportCard
          icon={TrendingUp}
          iconClass="bg-cdy-red/10 text-cdy-red"
          title="Cash Flow Forecast"
          description="90-day projected cash position"
          stat={
            cashFlow
              ? `Lowest balance: ${formatCurrency(cashFlow.lowestProjectedBalance)}`
              : 'Loading...'
          }
          badge={
            summary?.cashFlowAlert || cashFlow?.hasShortfall30Days
              ? 'Shortfall alert'
              : undefined
          }
          viewHref="/finance/reports/cashflow"
          onDownload={downloadCashFlow}
        />
        <ReportCard
          icon={Scale}
          iconClass="bg-green-500/10 text-green-400"
          title="Balance Sheet"
          description="Assets, liabilities, and equity as of a date"
          stat={
            balanceSheet
              ? `Equity: ${formatCurrency(balanceSheet.equity)}`
              : 'Loading...'
          }
          viewHref="/finance/reports/balance-sheet"
          onDownload={downloadBalanceSheet}
        />
        <ReportCard
          icon={Landmark}
          iconClass="bg-cdy-red/10 text-cdy-red"
          title="Tax Liability"
          description="Tax collected, remitted, and net owed for a period"
          stat={
            taxReport
              ? taxReport.netOwed > 0
                ? `Net owed: ${formatCurrency(taxReport.netOwed)}`
                : 'Net owed: RWF0.00 ✓'
              : 'Loading...'
          }
          statClass={
            taxReport && taxReport.netOwed > 0 ? 'text-cdy-red' : undefined
          }
          viewHref="/finance/reports/tax"
          onDownload={downloadTax}
        />
      </div>
    </div>
    </FeatureReadGate>
  );
}

function ReportCard({
  icon: Icon,
  iconClass,
  title,
  description,
  stat,
  statClass,
  badge,
  viewHref,
  onDownload,
}: {
  icon: typeof BarChart3;
  iconClass: string;
  title: string;
  description: string;
  stat: string;
  statClass?: string;
  badge?: string;
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
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-medium text-cdy-white">{title}</h3>
        {badge && (
          <span className="shrink-0 rounded-full bg-cdy-red/20 px-2 py-0.5 text-xs text-cdy-red">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-cdy-muted">{description}</p>
      <p className={`mt-3 text-sm ${statClass ?? 'text-cdy-white'}`}>{stat}</p>
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
