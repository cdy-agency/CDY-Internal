'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  useVenture,
  useVentureSummary,
  useVentureInvoices,
  useVentureExpenses,
  useVentureDirectIncome,
  type DirectIncomeEntry,
} from '@/hooks/useVentures';
import type { ApiResponse, RetainerRecord } from '@cdy/shared';
import { LogExpenseDrawer } from '@/components/finance/ventures/LogExpenseDrawer';
import { LogIncomeDrawer } from '@/components/finance/ventures/LogIncomeDrawer';
import { DirectIncomeDrawer } from '@/components/finance/directIncome/DirectIncomeDrawer';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { ExpenseCategoryBadge } from '@/components/finance/expenses/ExpenseCategoryBadge';
import { formatCurrency } from '@/lib/utils';
import { buildVenturePresets, ventureColorHex } from '@/lib/ventureUtils';
import type { ExpenseCategory } from '@cdy/shared';
import { formatMonthKey } from '@/lib/reportDates';

const presets = buildVenturePresets();
type Tab = 'income' | 'expenses' | 'clients' | 'retainers';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  client: { companyName: string } | null;
  serviceType: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface ExpenseRow {
  id: string;
  vendorName: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  ventureSharePercent: number | null;
  date: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export default function VentureDetailPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const ventureId = params.id as string;
  const queryClient = useQueryClient();

  const [activePreset, setActivePreset] = useState('this-month');
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [tab, setTab] = useState<Tab>('income');
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [directIncomeOpen, setDirectIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: venture, isLoading: ventureLoading } = useVenture(ventureId);
  const { data: summary, isLoading: summaryLoading } = useVentureSummary(ventureId, { from, to });
  const { data: invoicesData, isLoading: invoicesLoading } = useVentureInvoices(ventureId, { from, to });
  const { data: expensesData, isLoading: expensesLoading } = useVentureExpenses(ventureId, { from, to });
  const { data: directIncomeData } = useVentureDirectIncome(ventureId, { from, to });
  const { data: retainersData } = useQuery({
    queryKey: ['retainers', 'venture', ventureId],
    queryFn: async (): Promise<RetainerRecord[]> => {
      const res = await api.get<ApiResponse<RetainerRecord[]>>(
        `/retainers?ventureId=${ventureId}`,
      );
      return res.data.data;
    },
    enabled: !!ventureId,
    staleTime: 30_000,
  });
  const ventureRetainers = retainersData ?? [];

  const invoices = (invoicesData as PaginatedResult<InvoiceRow> | undefined)?.data ?? [];
  const expenses = (expensesData as PaginatedResult<ExpenseRow> | undefined)?.data ?? [];
  const directIncomeEntries: DirectIncomeEntry[] = directIncomeData?.data ?? [];
  const isLoading = ventureLoading || summaryLoading;

  async function handleDeactivate(): Promise<void> {
    if (!window.confirm('Deactivate this venture?')) return;
    try {
      await api.patch(`/ventures/${ventureId}/deactivate`);
      toast.success('Venture deactivated');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
    } catch {
      /* handled by interceptor */
    }
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await api.delete(`/ventures/${ventureId}`);
      toast.success('Venture deleted');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
      router.push('/finance/ventures');
    } catch {
      /* handled by interceptor */
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleSaveName(): Promise<void> {
    try {
      await api.patch(`/ventures/${ventureId}`, { name: nameValue.trim() });
      toast.success('Venture updated');
      setEditName(false);
      await queryClient.invalidateQueries({ queryKey: ['ventures', ventureId] });
    } catch {
      /* handled by interceptor */
    }
  }

  return (
    <FeatureReadGate feature="ventures.view" featureName="Ventures">
      <div className="space-y-6">
        <nav className="text-sm text-cdy-muted">
          <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
          <span className="mx-2">/</span>
          <Link href="/finance/ventures" className="hover:text-cdy-white">Ventures</Link>
          <span className="mx-2">/</span>
          <span className="text-cdy-white">{venture?.name ?? '…'}</span>
        </nav>

        {isLoading && <InvoiceTableSkeleton />}

        {venture && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: ventureColorHex(venture.color) }}
                  />
                  {editName ? (
                    <div className="flex items-center gap-2">
                      <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="w-64" />
                      <Button size="sm" onClick={handleSaveName}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditName(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <h1 className="text-2xl font-semibold text-cdy-white">{venture.name}</h1>
                  )}
                </div>
                {venture.description && <p className="mt-1 text-cdy-muted">{venture.description}</p>}
                <p className="mt-2 text-sm">
                  Status:{' '}
                  <span className={venture.isActive ? 'text-green-400' : 'text-cdy-muted'}>
                    {venture.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <PermissionGate feature="ventures.manage" action="write">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setNameValue(venture.name); setEditName(true); }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  {venture.isActive && (
                    <Button variant="outline" size="sm" onClick={handleDeactivate}>Deactivate</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </PermissionGate>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { setActivePreset(preset.id); setFrom(preset.from); setTo(preset.to); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activePreset === preset.id
                      ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                      : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <Input
                type="date"
                className="w-36"
                value={from}
                onChange={(e) => { setActivePreset('custom'); setFrom(e.target.value); }}
              />
              <span className="text-cdy-muted">—</span>
              <Input
                type="date"
                className="w-36"
                value={to}
                onChange={(e) => { setActivePreset('custom'); setTo(e.target.value); }}
              />
            </div>

            {summary && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Income', value: formatCurrency(summary.income.total) },
                  { label: 'Venture Expenses', value: formatCurrency(summary.expenses.ventureTotal) },
                  {
                    label: 'Net Profit',
                    value: formatCurrency(summary.netProfit),
                    className: summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
                  },
                  { label: 'Margin', value: `${summary.margin}%` },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
                    <p className="text-xs text-cdy-muted">{card.label}</p>
                    <p className={`mt-1 text-xl font-semibold ${card.className ?? 'text-cdy-white'}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-b border-cdy-navy-border">
              <div className="flex gap-4">
                {(['income', 'expenses', 'clients', 'retainers'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`border-b-2 px-1 pb-2 text-sm font-medium capitalize transition-colors ${
                      tab === t
                        ? 'border-cdy-red text-cdy-white'
                        : 'border-transparent text-cdy-muted hover:text-cdy-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'income' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-cdy-muted">
                    Income tagged to this venture ({invoices.length} invoices, {directIncomeEntries.length} direct in period).
                  </p>
                  <PermissionGate feature="ventures.manage" action="write">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDirectIncomeOpen(true)}>
                        <Plus className="h-4 w-4" /> Log Direct Income
                      </Button>
                      <Button size="sm" onClick={() => setIncomeOpen(true)}>
                        <Plus className="h-4 w-4" /> Log Invoice
                      </Button>
                    </div>
                  </PermissionGate>
                </div>

                {directIncomeEntries.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-cdy-muted">Direct Income</h3>
                    <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                      <table className="w-full text-sm">
                        <thead className="bg-cdy-navy text-left text-cdy-muted">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {directIncomeEntries.map((entry) => (
                            <tr key={entry.id} className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                              <td className="px-4 py-3 text-cdy-muted">
                                {format(new Date(entry.date), 'MMM d')}
                              </td>
                              <td className="px-4 py-3 text-cdy-white">{entry.description}</td>
                              <td className="px-4 py-3 text-cdy-muted">{entry.category ?? '—'}</td>
                              <td className="px-4 py-3 capitalize text-cdy-muted">
                                {entry.paymentMethod.replace(/_/g, ' ')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-green-400">
                                {formatCurrency(entry.amount, entry.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-medium text-cdy-muted">Invoices</h3>
                {invoicesLoading ? (
                  <InvoiceTableSkeleton />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                    <table className="w-full text-sm">
                      <thead className="bg-cdy-navy text-left text-cdy-muted">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Invoice #</th>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">Service</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                            <td className="px-4 py-3 text-cdy-muted">
                              {format(new Date(inv.createdAt), 'MMM d')}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/finance/invoices/${inv.id}`}
                                className="text-cdy-red hover:underline"
                              >
                                {inv.invoiceNumber}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-cdy-white">{inv.client?.companyName ?? '—'}</td>
                            <td className="px-4 py-3 capitalize text-cdy-muted">{inv.serviceType}</td>
                            <td className="px-4 py-3 text-right text-cdy-white">
                              {formatCurrency(inv.total, inv.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  inv.status === 'PAID'
                                    ? 'bg-green-950 text-green-400'
                                    : inv.status === 'OVERDUE'
                                    ? 'bg-red-950 text-red-400'
                                    : 'bg-cdy-navy text-cdy-muted'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {invoices.length === 0 && (
                      <p className="p-4 text-center text-cdy-muted">No invoices tagged to this venture in this period</p>
                    )}
                  </div>
                )}
                {summary && (
                  <p className="mt-2 text-sm text-cdy-muted">
                    Paid invoices total:{' '}
                    <span className="font-medium text-cdy-white">{formatCurrency(summary.income.total)}</span>
                  </p>
                )}
                </div>
              </div>
            )}

            {tab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-cdy-muted">
                    Finance expenses tagged to this venture ({expenses.length} in period).
                  </p>
                  <PermissionGate feature="ventures.manage" action="write">
                    <Button size="sm" onClick={() => setExpenseOpen(true)}>
                      <Plus className="h-4 w-4" /> Log Expense
                    </Button>
                  </PermissionGate>
                </div>
                {expensesLoading ? (
                  <InvoiceTableSkeleton />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                    <table className="w-full text-sm">
                      <thead className="bg-cdy-navy text-left text-cdy-muted">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Share %</th>
                          <th className="px-4 py-3 text-right">Venture Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((exp) => {
                          const sharePct = exp.ventureSharePercent ?? 100;
                          const ventureAmt = Number(((exp.amount * sharePct) / 100).toFixed(2));
                          return (
                            <tr key={exp.id} className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                              <td className="px-4 py-3 text-cdy-muted">
                                {format(new Date(exp.date), 'MMM d')}
                              </td>
                              <td className="px-4 py-3 text-cdy-white">{exp.vendorName}</td>
                              <td className="px-4 py-3">
                                <ExpenseCategoryBadge category={exp.category} />
                              </td>
                              <td className="px-4 py-3 text-right text-cdy-muted">
                                {formatCurrency(exp.amount, exp.currency)}
                              </td>
                              <td className="px-4 py-3 text-right text-cdy-muted">{sharePct}%</td>
                              <td className="px-4 py-3 text-right text-cdy-white">
                                {formatCurrency(ventureAmt, exp.currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {expenses.length === 0 && (
                      <p className="p-4 text-center text-cdy-muted">No expenses tagged to this venture in this period</p>
                    )}
                  </div>
                )}
                {summary && (
                  <p className="text-sm text-cdy-muted">
                    Total venture expenses this period:{' '}
                    <span className="font-medium text-cdy-white">
                      {formatCurrency(summary.expenses.ventureTotal)}
                    </span>
                  </p>
                )}
              </div>
            )}
            {tab === 'retainers' && (
              <div className="space-y-4">
                <p className="text-sm text-cdy-muted">
                  Retainer contracts linked to this venture ({ventureRetainers.length} total).
                </p>
                <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                  <table className="w-full text-sm">
                    <thead className="bg-cdy-navy text-left text-cdy-muted">
                      <tr>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3 text-right">Amount / mo</th>
                        <th className="px-4 py-3">Billing Day</th>
                        <th className="px-4 py-3">Next Invoice</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventureRetainers.map((r) => (
                        <tr key={r.id} className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                          <td className="px-4 py-3 font-medium text-cdy-white">
                            {r.clientName ?? r.clientId}
                          </td>
                          <td className="px-4 py-3 text-cdy-white">{r.serviceName}</td>
                          <td className="px-4 py-3 text-right text-cdy-white">
                            {formatCurrency(r.amount, r.currency)}
                          </td>
                          <td className="px-4 py-3 text-cdy-muted">{r.billingDayOfMonth}</td>
                          <td className="px-4 py-3 text-cdy-muted">
                            {formatMonthKey(r.nextBillingDate.slice(0, 7))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === 'ACTIVE' ? 'bg-green-900/40 text-green-400' :
                              r.status === 'PAUSED' ? 'bg-amber-900/40 text-amber-400' :
                              r.status === 'ENDED'  ? 'bg-red-900/40 text-red-400' :
                              'bg-gray-800 text-gray-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {ventureRetainers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-cdy-muted">
                            No retainers linked to this venture yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'clients' && (
              <div className="space-y-4">
                <p className="text-sm text-cdy-muted">
                  Clients tagged to this venture ({venture.clients?.length ?? 0} total).
                </p>
                <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                  <table className="w-full text-sm">
                    <thead className="bg-cdy-navy text-left text-cdy-muted">
                      <tr>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(venture.clients ?? []).map((c) => (
                        <tr key={c.id} className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                          <td className="px-4 py-3 font-medium text-cdy-white">
                            {c.companyName ?? c.contactName}
                          </td>
                          <td className="px-4 py-3 text-cdy-muted">{c.contactName}</td>
                          <td className="px-4 py-3 text-cdy-muted">{c.email}</td>
                          <td className="px-4 py-3 capitalize text-cdy-muted">
                            {c.primaryService?.replace(/_/g, ' ').toLowerCase() ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/crm/clients/${c.id}`}
                              className="text-cdy-red hover:underline"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {(venture.clients?.length ?? 0) === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-cdy-muted">
                            No clients tagged to this venture yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {venture && (
          <>
            <LogIncomeDrawer
              open={incomeOpen}
              ventureId={ventureId}
              ventureName={venture.name}
              onClose={() => setIncomeOpen(false)}
            />
            <DirectIncomeDrawer
              open={directIncomeOpen}
              ventureId={ventureId}
              ventureName={venture.name}
              onClose={() => setDirectIncomeOpen(false)}
            />
            <LogExpenseDrawer
              open={expenseOpen}
              ventureId={ventureId}
              ventureName={venture.name}
              onClose={() => setExpenseOpen(false)}
            />
          </>
        )}

        <ConfirmDialog
          open={deleteOpen}
          title="Delete venture?"
          description={
            venture
              ? `This will permanently remove "${venture.name}" and cannot be undone.`
              : undefined
          }
          confirmLabel="Delete"
          isLoading={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteOpen(false)}
        />
      </div>
    </FeatureReadGate>
  );
}
