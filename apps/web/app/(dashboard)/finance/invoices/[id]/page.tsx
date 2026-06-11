'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Loader2,
  Download,
  Send,
  Pencil,
  Trash2,
  CreditCard,
  FileText,
  Receipt,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { useInvoice } from '@/hooks/useInvoice';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { InvoiceDrawer } from '@/components/finance/invoiceDrawer/InvoiceDrawer';
import { RecordPaymentModal } from '@/components/finance/payments/RecordPaymentModal';
import { NotFound } from '@/components/finance/NotFound';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { InvoiceStatus } from '@cdy/shared';
import type { AxiosError } from 'axios';

export default function InvoiceDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: invoice, isLoading, isError, error } = useInvoice(params.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  const is404 =
    isError &&
    (error as AxiosError)?.response?.status === 404;

  async function handleSend(): Promise<void> {
    if (!invoice) return;
    setSendLoading(true);
    try {
      await api.post(`/invoices/${invoice.id}/send`, {});
      toast.success(`Invoice ${invoice.invoiceNumber} sent`);
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch {
      /* handled by interceptor */
    } finally {
      setSendLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!invoice) return;
    try {
      await api.delete(`/invoices/${invoice.id}`);
      toast.success('Invoice deleted');
      router.push('/finance/invoices');
    } catch {
      /* handled by interceptor */
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    if (!invoice) return;
    setPdfLoading(true);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[65%_35%]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (is404) {
    return <NotFound />;
  }

  if (!invoice) {
    return (
      <div className="text-center text-cdy-muted">Failed to load invoice</div>
    );
  }

  const fmt = (n: number): string => formatCurrency(n, invoice.currency);

  const timelineEvents: { date: Date | null; label: string; done: boolean }[] = [
    { date: new Date(invoice.createdAt), label: 'Invoice created', done: true },
  ];

  if (invoice.sentAt) {
    timelineEvents.push({
      date: new Date(invoice.sentAt),
      label: 'Invoice sent to client',
      done: true,
    });
  }

  invoice.payments.forEach((payment) => {
    timelineEvents.push({
      date: new Date(payment.paidAt),
      label: `Payment received — ${fmt(payment.amount)}`,
      done: true,
    });
  });

  if (invoice.status === InvoiceStatus.OVERDUE) {
    timelineEvents.push({
      date: new Date(invoice.dueDate),
      label: 'Invoice overdue',
      done: true,
    });
  }

  if (invoice.paidAt) {
    timelineEvents.push({
      date: new Date(invoice.paidAt),
      label: 'Invoice paid in full',
      done: true,
    });
  }

  timelineEvents.sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">
          Finance
        </Link>
        <span className="mx-2">/</span>
        <Link href="/finance/invoices" className="hover:text-cdy-white">
          Invoices
        </Link>
        <span className="mx-2">/</span>
        <span className="font-mono text-cdy-white">{invoice.invoiceNumber}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[65%_35%]">
        <div className="space-y-6">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-mono text-2xl font-bold text-cdy-white">
                  {invoice.invoiceNumber}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-cdy-muted">
                  <span>
                    Issued: {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span>
                    Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            <div className="mb-6">
              <p className="mb-1 text-xs uppercase tracking-wide text-cdy-muted">
                Bill To
              </p>
              <p className="font-medium text-cdy-white">{invoice.clientId}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-center">Qty</th>
                    <th className="pb-2 font-medium text-right">Unit Price</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-b border-cdy-navy-border/50 ${
                        i % 2 === 0 ? 'bg-cdy-navy/30' : ''
                      }`}
                    >
                      <td className="py-3 text-cdy-white">{item.description}</td>
                      <td className="py-3 text-center text-cdy-muted">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right text-cdy-muted">
                        {fmt(item.unitPrice)}
                      </td>
                      <td className="py-3 text-right font-medium text-cdy-white">
                        {fmt(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 text-right text-sm">
              <p className="text-cdy-muted">
                Subtotal: <span className="text-cdy-white">{fmt(invoice.subtotal)}</span>
              </p>
              {invoice.taxRate > 0 && (
                <p className="text-cdy-muted">
                  Tax ({invoice.taxRate}%):{' '}
                  <span className="text-cdy-white">{fmt(invoice.taxAmount)}</span>
                </p>
              )}
              <p className="text-xl font-bold text-cdy-white">
                Total: {fmt(invoice.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-medium text-cdy-white">Actions</h3>
            <div className="flex flex-col gap-2">
              {invoice.status === InvoiceStatus.DRAFT && (
                <>
                  <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                    <Pencil className="h-4 w-4" />
                    Edit Invoice
                  </Button>
                  <Button onClick={handleSend} disabled={sendLoading}>
                    {sendLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Invoice
                  </Button>
                  <Button
                    variant="outline"
                    className="text-[var(--cdy-danger)] hover:text-[var(--cdy-danger)]"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Invoice
                  </Button>
                </>
              )}

              {(invoice.status === InvoiceStatus.SENT ||
                invoice.status === InvoiceStatus.OVERDUE) && (
                <>
                  <Button onClick={() => setPaymentModalOpen(true)}>
                    <CreditCard className="h-4 w-4" />
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <Button variant="outline" disabled title="Coming in Sprint 5">
                    <FileText className="h-4 w-4" />
                    Credit Note
                  </Button>
                </>
              )}

              {invoice.status === InvoiceStatus.PARTIALLY_PAID && (
                <>
                  <Button onClick={() => setPaymentModalOpen(true)}>
                    <CreditCard className="h-4 w-4" />
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="#payments">View Payment History</a>
                  </Button>
                </>
              )}

              {invoice.status === InvoiceStatus.PAID && (
                <>
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <Button variant="outline" disabled title="Coming in Sprint 3">
                    <Receipt className="h-4 w-4" />
                    Download Receipt
                  </Button>
                </>
              )}
            </div>
          </div>

          <div
            id="payments"
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5"
          >
            <h3 className="mb-4 font-medium text-cdy-white">Payment History</h3>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-cdy-muted">No payments recorded yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-cdy-navy-border/50"
                    >
                      <td className="py-2 text-cdy-white">
                        {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2 text-right text-cdy-white">
                        {fmt(payment.amount)}
                      </td>
                      <td className="py-2 text-cdy-muted">
                        {payment.method.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 text-cdy-muted">
                        {payment.reference ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-medium text-cdy-white">Timeline</h3>
            <div className="space-y-4">
              {timelineEvents.map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      event.done
                        ? 'bg-cdy-red'
                        : 'border-2 border-cdy-muted bg-transparent'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-cdy-white">{event.label}</p>
                    {event.date && (
                      <p className="text-xs text-cdy-muted">
                        {format(event.date, 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <InvoiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        invoice={invoice}
      />

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={invoice}
      />
    </div>
  );
}
