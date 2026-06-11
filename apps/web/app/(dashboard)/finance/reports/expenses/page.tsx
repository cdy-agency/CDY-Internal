'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { useExpenseReport } from '@/hooks/useReports';
import { ExpenseCategoryBadge, EXPENSE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { EmptyReport } from '@/components/finance/reports/EmptyReport';
import { Button } from '@/components/ui/button';
import {
  currentMonthKey,
  shiftMonth,
  formatMonthKey,
} from '@/lib/reportDates';
import { formatCurrency, getUploadUrl } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { ExpenseCategory } from '@cdy/shared';

export default function ExpenseSummaryReportPage(): JSX.Element {
  const [month, setMonth] = useState(currentMonthKey());
  const [category, setCategory] = useState<ExpenseCategory | undefined>();
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, isError } = useExpenseReport({
    month,
    category,
  });

  const nextMonth = shiftMonth(month, 1);
  const isFutureMonth = nextMonth > currentMonthKey();

  async function handleDownload(): Promise<void> {
    setPdfLoading(true);
    try {
      await downloadReportPdf(
        '/reports/expenses/pdf',
        `CDY-Expenses-Report-${month}.pdf`,
        { month, category },
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Expense Summary</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium text-cdy-white">
            {formatMonthKey(month)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isFutureMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleDownload} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(undefined)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !category
              ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
              : 'border-cdy-navy-border text-cdy-muted'
          }`}
        >
          All
        </button>
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              category === c.value
                ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                : 'border-cdy-navy-border text-cdy-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {data && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-4 py-3 text-sm">
          <span className="text-cdy-muted">Total: </span>
          <span className="font-medium text-cdy-white">
            {formatCurrency(data.totalAmount)}
          </span>
          <span className="mx-2 text-cdy-muted">|</span>
          <span className="text-cdy-muted">vs last month: </span>
          <span
            className={
              data.momChangePercent >= 0
                ? 'text-[var(--cdy-success)]'
                : 'text-[var(--cdy-danger)]'
            }
          >
            {data.momChangePercent > 0 ? '+' : ''}
            {data.momChangePercent}%
          </span>
        </div>
      )}

      {isLoading && <InvoiceTableSkeleton />}
      {isError && (
        <div className="text-sm text-[var(--cdy-danger)]">Failed to load expense report</div>
      )}
      {!isLoading && data && data.totalAmount === 0 && <EmptyReport />}

      {!isLoading && data && data.totalAmount > 0 && (
        <>
          <div className="space-y-3 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
            {data.byCategory.map((cat) => {
              const pct =
                data.totalAmount > 0
                  ? (cat.amount / data.totalAmount) * 100
                  : 0;
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-right text-sm text-cdy-muted">
                    {cat.category.charAt(0) + cat.category.slice(1).toLowerCase()}
                  </span>
                  <div className="flex h-5 flex-1 overflow-hidden rounded bg-cdy-navy">
                    <div
                      className="h-full bg-cdy-red"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right font-mono text-sm text-cdy-white">
                    {formatCurrency(cat.amount)}
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs text-cdy-muted">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">This Month</th>
                  <th className="px-4 py-3 font-medium text-right">Last Month</th>
                  <th className="px-4 py-3 font-medium text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((cat) => (
                  <tr key={cat.category} className="border-b border-cdy-navy-border/50">
                    <td className="px-4 py-2">
                      <ExpenseCategoryBadge category={cat.category} />
                    </td>
                    <td className="px-4 py-2 text-right text-cdy-white">
                      {formatCurrency(cat.amount)}
                    </td>
                    <td className="px-4 py-2 text-right text-cdy-muted">
                      {formatCurrency(cat.previousAmount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {cat.changePercent > 0 ? '+' : ''}
                      {cat.changePercent}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-cdy-navy font-medium">
                  <td className="px-4 py-2 text-cdy-white">Total</td>
                  <td className="px-4 py-2 text-right text-cdy-white">
                    {formatCurrency(data.totalAmount)}
                  </td>
                  <td className="px-4 py-2 text-right text-cdy-muted">
                    {formatCurrency(data.previousMonthTotal)}
                  </td>
                  <td className="px-4 py-2 text-right text-cdy-white">
                    {data.momChangePercent > 0 ? '+' : ''}
                    {data.momChangePercent}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-cdy-navy-border/50">
                    <td className="px-4 py-2 text-cdy-white">
                      {format(new Date(exp.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2 text-cdy-white">{exp.vendorName}</td>
                    <td className="px-4 py-2">
                      <ExpenseCategoryBadge category={exp.category} />
                    </td>
                    <td className="px-4 py-2 text-right text-cdy-white">
                      {formatCurrency(exp.amount, exp.currency)}
                    </td>
                    <td className="px-4 py-2 text-cdy-muted">
                      {exp.projectId ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {exp.receiptUrl ? (
                        <a
                          href={getUploadUrl(exp.receiptUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Paperclip className="mx-auto h-4 w-4 text-cdy-red" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
