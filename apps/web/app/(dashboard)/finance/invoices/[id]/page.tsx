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
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { downloadCreditNotePdf } from '@/lib/creditNotePdf';
import { useInvoice } from '@/hooks/useInvoice';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { InvoiceDrawer } from '@/components/finance/invoiceDrawer/InvoiceDrawer';
import { RecordPaymentModal } from '@/components/finance/payments/RecordPaymentModal';
import { WriteOffModal } from '@/components/finance/invoices/WriteOffModal';
import { CreditNoteDrawer } from '@/components/finance/creditNotes/CreditNoteDrawer';
import { PaymentPlanDrawer } from '@/components/finance/paymentPlans/PaymentPlanDrawer';
import { PayInstalmentModal } from '@/components/finance/paymentPlans/PayInstalmentModal';
import { NotFound } from '@/components/finance/NotFound';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  InstalmentStatus,
  InvoiceStatus,
  PaymentPlanStatus,
} from '@cdy/shared';
import type { PaymentPlanInstalment } from '@cdy/shared';
import type { AxiosError } from 'axios';
import { PermissionGate } from '@/components/PermissionGate';

const UNPAID_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const CREDIT_NOTE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.PAID,
  InvoiceStatus.OVERDUE,
];

export default function InvoiceDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: invoice, isLoading, isError, error } = useInvoice(params.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [creditNoteOpen, setCreditNoteOpen] = useState(false);
  const [paymentPlanOpen, setPaymentPlanOpen] = useState(false);
  const [payInstalment, setPayInstalment] =
    useState<PaymentPlanInstalment | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [cnPdfLoading, setCnPdfLoading] = useState<string | null>(null);
  const [cancelPlanLoading, setCancelPlanLoading] = useState(false);

  const is404 =
    isError && (error as AxiosError)?.response?.status === 404;

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

  async function handleCreditNotePdf(
    creditNoteId: string,
    creditNoteNumber: string,
  ): Promise<void> {
    setCnPdfLoading(creditNoteId);
    try {
      await downloadCreditNotePdf(creditNoteId, creditNoteNumber);
    } catch {
      toast.error('Failed to download credit note PDF');
    } finally {
      setCnPdfLoading(null);
    }
  }

  async function handleCancelPlan(): Promise<void> {
    if (!invoice?.paymentPlan) return;
    setCancelPlanLoading(true);
    try {
      await api.delete(`/payment-plans/${invoice.paymentPlan.id}`);
      toast.success('Payment plan cancelled');
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    } catch {
      /* interceptor */
    } finally {
      setCancelPlanLoading(false);
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
  const plan = invoice.paymentPlan;
  const hasActivePlan =
    plan && plan.status === PaymentPlanStatus.ACTIVE;
  const anyInstalmentPaid =
    plan?.instalments.some((i) => i.status === InstalmentStatus.PAID) ?? false;
  const remainingPlanBalance =
    plan?.instalments
      .filter((i) => i.status !== InstalmentStatus.PAID)
      .reduce((s, i) => s + i.amount, 0) ?? 0;

  const canWriteOff = UNPAID_STATUSES.includes(invoice.status);
  const canCreditNote = CREDIT_NOTE_STATUSES.includes(invoice.status);
  const canPaymentPlan =
    UNPAID_STATUSES.includes(invoice.status) && !plan;
  const showRecordPayment =
    UNPAID_STATUSES.includes(invoice.status) && !hasActivePlan;

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

  if (invoice.writtenOffAt) {
    timelineEvents.push({
      date: new Date(invoice.writtenOffAt),
      label: `Invoice written off${invoice.writeOffReason ? ` — ${invoice.writeOffReason}` : ''}`,
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
                  <span>Terms: Net {invoice.creditTermsDays}</span>
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
                Subtotal:{' '}
                <span className="text-cdy-white">{fmt(invoice.subtotal)}</span>
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

          {plan && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-cdy-white">
                  Payment Plan — {plan.status}
                </h3>
                <Calendar className="h-4 w-4 text-cdy-muted" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.instalments.map((inst) => (
                    <tr
                      key={inst.id}
                      className="border-b border-cdy-navy-border/50"
                    >
                      <td className="py-2 text-cdy-white">
                        {inst.instalmentNumber}
                      </td>
                      <td className="py-2 text-right text-cdy-white">
                        {fmt(inst.amount)}
                      </td>
                      <td className="py-2 text-cdy-muted">
                        {format(new Date(inst.dueDate), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2">
                        {inst.status === InstalmentStatus.PAID ? (
                          <span className="text-[var(--cdy-success)]">
                            ✅ PAID
                          </span>
                        ) : inst.status === InstalmentStatus.OVERDUE ? (
                          <span className="text-cdy-red">⚠ OVERDUE</span>
                        ) : (
                          <span className="text-amber-400">⏳ PENDING</span>
                        )}
                      </td>
                      <td className="py-2">
                        <PermissionGate feature="finance.payment_plans" action="write">
                          {inst.status !== InstalmentStatus.PAID &&
                            plan.status === PaymentPlanStatus.ACTIVE && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPayInstalment(inst)}
                              >
                                Mark as Paid
                              </Button>
                            )}
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-cdy-muted">
                Remaining:{' '}
                <span className="font-medium text-cdy-white">
                  {fmt(remainingPlanBalance)}
                </span>
              </p>
              <PermissionGate feature="finance.payment_plans" action="write">
                {plan.status === PaymentPlanStatus.ACTIVE &&
                  !anyInstalmentPaid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-cdy-muted"
                      onClick={handleCancelPlan}
                      disabled={cancelPlanLoading}
                    >
                      {cancelPlanLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Cancel Plan'
                      )}
                    </Button>
                  )}
              </PermissionGate>
            </div>
          )}

          {invoice.creditNotes.length > 0 && (
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <h3 className="mb-4 font-medium text-cdy-white">Credit Notes</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2 font-medium">Number</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium">Issued</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.creditNotes.map((cn) => (
                    <tr
                      key={cn.id}
                      className="border-b border-cdy-navy-border/50"
                    >
                      <td className="py-2 font-mono text-cdy-white">
                        {cn.creditNoteNumber}
                      </td>
                      <td className="py-2 text-right text-cdy-white">
                        {fmt(cn.amount)}
                      </td>
                      <td className="py-2 text-cdy-muted">
                        {cn.reason.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 text-cdy-muted">
                        {format(new Date(cn.issuedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2 text-cdy-muted">{cn.status}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCreditNotePdf(cn.id, cn.creditNoteNumber)
                          }
                          disabled={cnPdfLoading === cn.id}
                        >
                          {cnPdfLoading === cn.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'View PDF'
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-medium text-cdy-white">Actions</h3>
            <div className="flex flex-col gap-2">
              <PermissionGate feature="finance.invoices" action="write">
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
              </PermissionGate>

              {UNPAID_STATUSES.includes(invoice.status) && (
                <>
                  <PermissionGate feature="finance.payments" action="write">
                    {showRecordPayment && (
                      <Button onClick={() => setPaymentModalOpen(true)}>
                        <CreditCard className="h-4 w-4" />
                        Record Payment
                      </Button>
                    )}
                  </PermissionGate>
                  <PermissionGate feature="finance.payment_plans" action="write">
                    {canPaymentPlan && (
                      <Button
                        variant="outline"
                        onClick={() => setPaymentPlanOpen(true)}
                      >
                        <Calendar className="h-4 w-4" />
                        Create Payment Plan
                      </Button>
                    )}
                  </PermissionGate>
                  <PermissionGate feature="finance.credit_notes" action="write">
                    {canCreditNote && (
                      <Button
                        variant="outline"
                        onClick={() => setCreditNoteOpen(true)}
                      >
                        <FileText className="h-4 w-4" />
                        Raise Credit Note
                      </Button>
                    )}
                  </PermissionGate>
                  <PermissionGate feature="finance.invoices" action="write">
                    {canWriteOff && (
                      <Button
                        variant="outline"
                        className="text-cdy-red hover:text-cdy-red"
                        onClick={() => setWriteOffOpen(true)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Write Off Invoice
                      </Button>
                    )}
                  </PermissionGate>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                </>
              )}

              {invoice.status === InvoiceStatus.PAID && (
                <>
                  <PermissionGate feature="finance.credit_notes" action="write">
                    <Button
                      variant="outline"
                      onClick={() => setCreditNoteOpen(true)}
                    >
                      <FileText className="h-4 w-4" />
                      Raise Credit Note
                    </Button>
                  </PermissionGate>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <Button variant="outline" disabled title="Coming soon">
                    <Receipt className="h-4 w-4" />
                    Download Receipt
                  </Button>
                </>
              )}

              {invoice.status === InvoiceStatus.WRITTEN_OFF && (
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
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

      <WriteOffModal
        open={writeOffOpen}
        onClose={() => setWriteOffOpen(false)}
        invoice={invoice}
      />

      <CreditNoteDrawer
        open={creditNoteOpen}
        onClose={() => setCreditNoteOpen(false)}
        invoice={invoice}
      />

      <PaymentPlanDrawer
        open={paymentPlanOpen}
        onClose={() => setPaymentPlanOpen(false)}
        invoice={invoice}
      />

      {plan && payInstalment && (
        <PayInstalmentModal
          open={Boolean(payInstalment)}
          onClose={() => setPayInstalment(null)}
          plan={plan}
          instalment={payInstalment}
          currency={invoice.currency}
          invoiceId={invoice.id}
        />
      )}
    </div>
  );
}
