'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useTaxReport } from '@/hooks/useTax';
import { RecordRemittanceModal } from '@/components/finance/tax/RecordRemittanceModal';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { PermissionGate } from '@/components/PermissionGate';
import type { TaxPaymentRecord } from '@cdy/shared';

function monthRange(year: number, month: number): { from: string; to: string } {
  const d = new Date(year, month, 1);
  return {
    from: format(startOfMonth(d), 'yyyy-MM-dd'),
    to: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

export default function TaxReportPage(): JSX.Element {
  const now = new Date();
  const defaultRange = monthRange(now.getFullYear(), now.getMonth());
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [remittanceOpen, setRemittanceOpen] = useState(false);
  const [remittanceToDelete, setRemittanceToDelete] =
    useState<TaxPaymentRecord | null>(null);
  const [deletingRemittance, setDeletingRemittance] = useState(false);
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useTaxReport({ from, to });

  async function handleDeleteRemittance(): Promise<void> {
    if (!remittanceToDelete) return;
    setDeletingRemittance(true);
    try {
      await api.delete(`/tax/remittances/${remittanceToDelete.id}`);
      toast.success('Remittance deleted');
      await queryClient.invalidateQueries({ queryKey: ['tax'] });
    } catch {
      /* handled by interceptor */
    } finally {
      setDeletingRemittance(false);
      setRemittanceToDelete(null);
    }
  }

  async function downloadPdf(): Promise<void> {
    try {
      await downloadReportPdf(
        '/tax/report/pdf',
        `CDY-Tax-Report-${format(new Date(), 'MMM-yyyy')}.pdf`,
        { from, to },
      );
    } catch {
      toast.error('Failed to download PDF');
    }
  }

  return (
    <FeatureReadGate feature="finance.reports" featureName="Financial Reports">
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Tax Liability</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-cdy-white">Tax Liability Report</h1>
        <div className="flex gap-2">
          <PermissionGate feature="finance.tax" action="write">
            <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setRemittanceOpen(true)}>
              Record Remittance
            </Button>
          </PermissionGate>
          <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {report && (
        <div className="space-y-6 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <div>
            <h2 className="text-lg font-semibold text-cdy-red">TAX LIABILITY REPORT</h2>
            <p className="text-sm text-cdy-muted">
              Period: {format(new Date(report.period.from), 'MMMM yyyy')} –{' '}
              {format(new Date(report.period.to), 'MMMM yyyy')}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium uppercase text-cdy-muted">Tax Collected</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="pb-2">Rate</th>
                  <th className="pb-2 text-center">Invoices</th>
                  <th className="pb-2 text-right">Gross Revenue</th>
                  <th className="pb-2 text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.taxCollected.byRate.map((row, i) => (
                  <tr key={i} className="border-b border-cdy-navy-border/50">
                    <td className="py-2 text-cdy-white">
                      {row.rateName} ({row.ratePercent}%)
                    </td>
                    <td className="py-2 text-center text-cdy-muted">{row.invoiceCount}</td>
                    <td className="py-2 text-right text-cdy-white">
                      {formatCurrency(row.grossRevenue)}
                    </td>
                    <td className="py-2 text-right text-cdy-white">
                      {formatCurrency(row.taxAmount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td colSpan={3} className="py-2 text-cdy-white">TOTAL COLLECTED</td>
                  <td className="py-2 text-right text-cdy-white">
                    {formatCurrency(report.taxCollected.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-cdy-muted">
            INPUT TAX RECOVERABLE: {formatCurrency(report.inputTax)}
            <span className="ml-2 text-xs">(tracked in future sprint)</span>
          </p>
          <p className="text-sm text-cdy-muted">
            TAX REMITTED THIS PERIOD: {formatCurrency(report.totalRemitted)}
          </p>

          <div
            className={`rounded-lg border p-4 text-center text-xl font-bold ${
              report.netOwed > 0
                ? 'border-cdy-red/50 bg-cdy-red-light/10 text-cdy-red'
                : 'border-green-500/30 bg-green-950/20 text-[var(--cdy-success)]'
            }`}
          >
            NET TAX OWED: {formatCurrency(report.netOwed)}
          </div>

          {report.remittances.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium uppercase text-cdy-muted">Remittances Paid</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Authority</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2">Reference</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.remittances.map((r) => (
                    <tr key={r.id} className="border-b border-cdy-navy-border/50">
                      <td className="py-2 text-cdy-muted">
                        {format(new Date(r.paidAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2 text-cdy-white">{r.authorityName}</td>
                      <td className="py-2 text-right text-cdy-white">
                        {formatCurrency(r.amount, r.currency)}
                      </td>
                      <td className="py-2 text-cdy-muted">{r.reference ?? '—'}</td>
                      <td className="py-2">
                        <PermissionGate feature="finance.tax" action="write">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[var(--cdy-danger)] hover:text-[var(--cdy-danger)]"
                            onClick={() => setRemittanceToDelete(r)}
                            aria-label="Delete remittance"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <RecordRemittanceModal open={remittanceOpen} onClose={() => setRemittanceOpen(false)} />

      <ConfirmDialog
        open={Boolean(remittanceToDelete)}
        title="Delete remittance?"
        description={
          remittanceToDelete
            ? `This will permanently delete the ${formatCurrency(remittanceToDelete.amount, remittanceToDelete.currency)} remittance to ${remittanceToDelete.authorityName}. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        isLoading={deletingRemittance}
        onConfirm={handleDeleteRemittance}
        onCancel={() => setRemittanceToDelete(null)}
      />
    </div>
    </FeatureReadGate>
  );
}
