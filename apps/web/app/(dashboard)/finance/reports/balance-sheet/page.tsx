'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useBalanceSheetReport } from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { cn } from '@/lib/utils';

export default function BalanceSheetPage(): JSX.Element {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, isError } = useBalanceSheetReport(date);

  async function handleDownloadPdf(): Promise<void> {
    setPdfLoading(true);
    try {
      await downloadReportPdf(
        '/reports/balance-sheet/pdf',
        `CDY-BalanceSheet-${date}.pdf`,
        { date },
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;
  if (isError || !data) {
    return <p className="text-cdy-muted">Failed to load balance sheet.</p>;
  }

  const noData =
    data.assets.totalAssets === 0 && data.liabilities.totalLiabilities === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cdy-muted">
            <Link href="/finance/reports" className="hover:text-cdy-white">
              Reports
            </Link>{' '}
            / Balance Sheet
          </p>
          <h1 className="text-2xl font-semibold text-cdy-white">Balance Sheet</h1>
        </div>
        <Button onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-cdy-muted">As of</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      {noData && (
        <p className="text-sm text-cdy-muted">
          No data available for this date.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-cdy-red">
            ASSETS
          </h2>
          <div className="space-y-3 text-sm">
            <Link
              href="/finance/reports/ageing"
              className="flex justify-between hover:text-cdy-red"
            >
              <span className="text-cdy-muted">Accounts Receivable</span>
              <span className="text-cdy-white">
                {formatCurrency(data.assets.accountsReceivable)}
              </span>
            </Link>
            <div className="flex justify-between">
              <span className="text-cdy-muted">Cash (manual entry)</span>
              <span className="text-cdy-white">
                {formatCurrency(data.assets.cash)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cdy-muted">Other Assets (manual)</span>
              <span className="text-cdy-white">
                {formatCurrency(data.assets.otherAssets)}
              </span>
            </div>
            <div className="flex justify-between border-t border-cdy-navy-border pt-3 font-semibold">
              <span className="text-cdy-white">TOTAL ASSETS</span>
              <span className="text-cdy-white">
                {formatCurrency(data.assets.totalAssets)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-wider text-cdy-red">
            LIABILITIES
          </h2>
          <div className="space-y-3 text-sm">
            <Link
              href="/finance/bills"
              className="flex justify-between hover:text-cdy-red"
            >
              <span className="text-cdy-muted">Accounts Payable</span>
              <span className="text-cdy-white">
                {formatCurrency(data.liabilities.accountsPayable)}
              </span>
            </Link>
            <div className="flex justify-between">
              <span className="text-cdy-muted">Other Liabilities</span>
              <span className="text-cdy-white">
                {formatCurrency(data.liabilities.otherLiabilities)}
              </span>
            </div>
            <div className="flex justify-between border-t border-cdy-navy-border pt-3 font-semibold">
              <span className="text-cdy-white">TOTAL LIABILITIES</span>
              <span className="text-cdy-white">
                {formatCurrency(data.liabilities.totalLiabilities)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg p-6 text-center',
          data.equity >= 0 ? 'bg-cdy-navy' : 'bg-cdy-red-light',
        )}
      >
        <p className="text-sm text-cdy-muted">
          NET EQUITY (Assets − Liabilities)
        </p>
        <p
          className={cn(
            'mt-2 text-3xl font-bold',
            data.equity >= 0 ? 'text-green-400' : 'text-cdy-red',
          )}
        >
          {formatCurrency(data.equity)}
        </p>
      </div>
    </div>
  );
}
