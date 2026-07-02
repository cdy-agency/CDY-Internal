'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAgeingReport } from '@/hooks/useReports';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import api from '@/lib/api';
import type { AgeingBucketData, AgeingReportData } from '@cdy/shared';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { PermissionGate } from '@/components/PermissionGate';

const BUCKET_CONFIG: {
  key: keyof AgeingReportData['buckets'];
  label: string;
  borderClass: string;
  textClass: string;
}[] = [
  { key: 'current', label: 'Current', borderClass: 'border-cdy-navy-border', textClass: 'text-cdy-muted' },
  { key: 'days1_30', label: '1–30 Days Overdue', borderClass: 'border-yellow-500/30', textClass: 'text-yellow-400' },
  { key: 'days31_60', label: '31–60 Days Overdue', borderClass: 'border-orange-500/30', textClass: 'text-orange-400' },
  { key: 'days61_90', label: '61–90 Days Overdue', borderClass: 'border-red-500/30', textClass: 'text-red-400' },
  { key: 'days90plus', label: '90+ Days Overdue', borderClass: 'border-cdy-red/50', textClass: 'text-cdy-red' },
];

function ReminderButton({ invoiceId }: { invoiceId: string }): JSX.Element {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(): Promise<void> {
    setLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/send-reminder`, {});
      toast.success('Reminder sent to client');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      await queryClient.invalidateQueries({ queryKey: ['reports', 'ageing'] });
    } catch {
      /* interceptor */
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <span className="text-xs text-[var(--cdy-success)]">Sent ✓</span>;
  }

  return (
    <PermissionGate feature="finance.invoices" action="write">
      <Button variant="outline" size="sm" onClick={send} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Reminder'}
      </Button>
    </PermissionGate>
  );
}

function BucketCard({
  label,
  borderClass,
  textClass,
  bucket,
}: {
  label: string;
  borderClass: string;
  textClass: string;
  bucket: AgeingBucketData;
}): JSX.Element {
  const [open, setOpen] = useState(bucket.count > 0);

  return (
    <div className={`rounded-lg border ${borderClass} bg-cdy-navy-light`}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-cdy-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-cdy-muted" />
          )}
          <span className={`font-medium ${textClass}`}>{label}</span>
        </div>
        <span className="text-sm text-cdy-white">
          {bucket.count} invoice{bucket.count === 1 ? '' : 's'} —{' '}
          {formatCurrency(bucket.total)}
        </span>
      </button>
      {open && bucket.count > 0 && (
        <div className="border-t border-cdy-navy-border/50 px-4 pb-4">
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-cdy-muted">
                <th className="pb-2 font-medium">Invoice #</th>
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {bucket.invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-cdy-navy-border/30">
                  <td className="py-2 font-mono text-cdy-red">
                    <Link href={`/finance/invoices/${inv.id}`}>
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-2 text-cdy-white">{inv.clientName}</td>
                  <td className="py-2 text-right text-cdy-white">
                    {formatCurrency(inv.remaining)}
                  </td>
                  <td className="py-2 text-cdy-muted">
                    {format(new Date(inv.dueDate), 'MMM d, yyyy')}
                  </td>
                  <td className="py-2 text-right">
                    {inv.daysOverdue > 0 && <ReminderButton invoiceId={inv.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InvoiceAgeingPage(): JSX.Element {
  const [clientId, setClientId] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const { data, isLoading, isError } = useAgeingReport({
    clientId: clientId || undefined,
  });

  async function handleDownload(): Promise<void> {
    setPdfLoading(true);
    try {
      await downloadReportPdf(
        '/reports/ageing/pdf',
        `CDY-Ageing-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        { clientId: clientId || undefined },
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
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
        <span className="text-cdy-white">Invoice Ageing</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-cdy-white">Invoice Ageing</h1>
          <p className="text-sm text-cdy-muted">
            As of {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filter by client..."
            className="w-48"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <Button onClick={handleDownload} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download PDF'}
          </Button>
        </div>
      </div>

      {data && (
        <p className="text-3xl font-bold text-cdy-white">
          {formatCurrency(data.totalOutstanding)}{' '}
          <span className="text-base font-normal text-cdy-muted">outstanding</span>
        </p>
      )}

      {isLoading && <InvoiceTableSkeleton />}
      {isError && (
        <div className="text-sm text-[var(--cdy-danger)]">Failed to load ageing report</div>
      )}
      {data && (
        <div className="space-y-3">
          {BUCKET_CONFIG.map((cfg) => (
            <BucketCard
              key={cfg.key}
              label={cfg.label}
              borderClass={cfg.borderClass}
              textClass={cfg.textClass}
              bucket={data.buckets[cfg.key]}
            />
          ))}
        </div>
      )}
    </div>
    </FeatureReadGate>
  );
}
