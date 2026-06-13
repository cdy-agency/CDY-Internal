'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  useVenture,
  useVentureSummary,
  useVentureIncome,
  useVentureExpenses,
} from '@/hooks/useVentures';
import { LogIncomeDrawer } from '@/components/finance/ventures/LogIncomeDrawer';
import { LogExpenseDrawer } from '@/components/finance/ventures/LogExpenseDrawer';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { ExpenseCategoryBadge } from '@/components/finance/expenses/ExpenseCategoryBadge';
import { formatCurrency } from '@/lib/utils';
import {
  buildVenturePresets,
  ventureColorHex,
  exportCsv,
} from '@/lib/ventureUtils';
import type { VentureExpenseRecord } from '@cdy/shared';

const presets = buildVenturePresets();

type Tab = 'income' | 'expenses';

function SharedBadge({ expense }: { expense: VentureExpenseRecord }): JSX.Element {
  if (!expense.isShared) {
    return <span className="text-cdy-muted">No</span>;
  }
  const cdyPct = expense.cdyShare ?? 0;
  return (
    <span
      title={`Venture ${expense.ventureShare}% · CDY ${cdyPct}% · Total ${formatCurrency(expense.totalAmount, expense.currency)}`}
      className="cursor-help rounded-full bg-amber-950 px-2 py-0.5 text-xs text-amber-400"
    >
      Shared (CDY {cdyPct}%)
    </span>
  );
}

export default function VentureDetailPage(): JSX.Element {
  const params = useParams();
  const ventureId = params.id as string;
  const queryClient = useQueryClient();

  const [activePreset, setActivePreset] = useState('this-month');
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [tab, setTab] = useState<Tab>('income');
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const { data: venture, isLoading: ventureLoading } = useVenture(ventureId);
  const { data: summary, isLoading: summaryLoading } = useVentureSummary(ventureId, {
    from,
    to,
  });
  const { data: incomeEntries, isLoading: incomeLoading } = useVentureIncome(ventureId, {
    from,
    to,
  });
  const { data: expenseEntries, isLoading: expensesLoading } = useVentureExpenses(
    ventureId,
    { from, to },
  );

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

  async function deleteIncome(entryId: string): Promise<void> {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await api.delete(`/ventures/${ventureId}/income/${entryId}`);
      toast.success('Income entry deleted');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
    } catch {
      /* handled by interceptor */
    }
  }

  async function deleteExpense(entryId: string): Promise<void> {
    if (!window.confirm('Delete this expense entry?')) return;
    try {
      await api.delete(`/ventures/${ventureId}/expenses/${entryId}`);
      toast.success('Expense entry deleted');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
    } catch {
      /* handled by interceptor */
    }
  }

  function exportIncomeCsv(): void {
    if (!incomeEntries?.length) return;
    exportCsv(
      `venture-${venture?.name ?? ventureId}-income.csv`,
      ['Date', 'Description', 'Category', 'Amount', 'Currency'],
      incomeEntries.map((e) => [
        format(new Date(e.date), 'yyyy-MM-dd'),
        e.description,
        e.category,
        String(e.amount),
        e.currency,
      ]),
    );
  }

  function exportExpensesCsv(): void {
    if (!expenseEntries?.length) return;
    exportCsv(
      `venture-${venture?.name ?? ventureId}-expenses.csv`,
      ['Date', 'Description', 'Category', 'Total', 'Share', 'Amount', 'Shared'],
      expenseEntries.map((e) => [
        format(new Date(e.date), 'yyyy-MM-dd'),
        e.description,
        e.category,
        String(e.totalAmount),
        `${e.ventureShare}%`,
        String(e.ventureAmount),
        e.isShared ? `Yes (CDY ${e.cdyShare ?? 0}%)` : 'No',
      ]),
    );
  }

  return (
    <FeatureReadGate feature="ventures.view" featureName="Ventures">
      <div className="space-y-6">
        <nav className="text-sm text-cdy-muted">
          <Link href="/finance" className="hover:text-cdy-white">
            Finance
          </Link>
          <span className="mx-2">/</span>
          <Link href="/finance/ventures" className="hover:text-cdy-white">
            Ventures
          </Link>
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
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        className="w-64"
                      />
                      <Button size="sm" onClick={handleSaveName}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditName(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <h1 className="text-2xl font-semibold text-cdy-white">{venture.name}</h1>
                  )}
                </div>
                {venture.description && (
                  <p className="mt-1 text-cdy-muted">{venture.description}</p>
                )}
                <p className="mt-2 text-sm">
                  Status:{' '}
                  <span className={venture.isActive ? 'text-green-400' : 'text-cdy-muted'}>
                    {venture.isActive ? '✅ Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <PermissionGate feature="ventures.manage" action="write">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNameValue(venture.name);
                      setEditName(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  {venture.isActive && (
                    <Button variant="outline" size="sm" onClick={handleDeactivate}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </PermissionGate>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActivePreset(preset.id);
                    setFrom(preset.from);
                    setTo(preset.to);
                  }}
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
                onChange={(e) => {
                  setActivePreset('custom');
                  setFrom(e.target.value);
                }}
              />
              <span className="text-cdy-muted">—</span>
              <Input
                type="date"
                className="w-36"
                value={to}
                onChange={(e) => {
                  setActivePreset('custom');
                  setTo(e.target.value);
                }}
              />
            </div>

            {summary && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Total Income', value: formatCurrency(summary.income.total) },
                  { label: 'Total Expenses', value: formatCurrency(summary.expenses.total) },
                  {
                    label: 'Net Profit',
                    value: formatCurrency(summary.netProfit),
                    className: summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400',
                  },
                  { label: 'Margin', value: `${summary.margin}%` },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
                  >
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
                {(['income', 'expenses'] as Tab[]).map((t) => (
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PermissionGate feature="ventures.manage" action="write">
                    <Button size="sm" onClick={() => setIncomeOpen(true)}>
                      + Log Income
                    </Button>
                  </PermissionGate>
                  <Button size="sm" variant="outline" onClick={exportIncomeCsv}>
                    Export CSV
                  </Button>
                </div>
                {incomeLoading ? (
                  <InvoiceTableSkeleton />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                    <table className="w-full text-sm">
                      <thead className="bg-cdy-navy text-left text-cdy-muted">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {incomeEntries?.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30"
                          >
                            <td className="px-4 py-3 text-cdy-muted">
                              {format(new Date(entry.date), 'MMM d')}
                            </td>
                            <td className="px-4 py-3 text-cdy-white">{entry.description}</td>
                            <td className="px-4 py-3 text-cdy-muted">{entry.category}</td>
                            <td className="px-4 py-3 text-right text-cdy-white">
                              {formatCurrency(entry.amount, entry.currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <PermissionGate feature="ventures.manage" action="write">
                                <button
                                  type="button"
                                  onClick={() => deleteIncome(entry.id)}
                                  className="text-cdy-muted hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {incomeEntries?.length === 0 && (
                      <p className="p-4 text-center text-cdy-muted">No income entries</p>
                    )}
                  </div>
                )}
                {summary && (
                  <p className="text-sm text-cdy-muted">
                    Total income this period:{' '}
                    <span className="font-medium text-cdy-white">
                      {formatCurrency(summary.income.total)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {tab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PermissionGate feature="ventures.manage" action="write">
                    <Button size="sm" onClick={() => setExpenseOpen(true)}>
                      + Log Expense
                    </Button>
                  </PermissionGate>
                  <Button size="sm" variant="outline" onClick={exportExpensesCsv}>
                    Export CSV
                  </Button>
                </div>
                {expensesLoading ? (
                  <InvoiceTableSkeleton />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
                    <table className="w-full text-sm">
                      <thead className="bg-cdy-navy text-left text-cdy-muted">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Share</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Shared?</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {expenseEntries?.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-t border-cdy-navy-border/50 hover:bg-cdy-navy/30"
                          >
                            <td className="px-4 py-3 text-cdy-muted">
                              {format(new Date(entry.date), 'MMM d')}
                            </td>
                            <td className="px-4 py-3 text-cdy-white">{entry.description}</td>
                            <td className="px-4 py-3">
                              <ExpenseCategoryBadge category={entry.category} />
                            </td>
                            <td className="px-4 py-3 text-right text-cdy-muted">
                              {formatCurrency(entry.totalAmount, entry.currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-cdy-muted">
                              {entry.ventureShare}%
                            </td>
                            <td className="px-4 py-3 text-right text-cdy-white">
                              {formatCurrency(entry.ventureAmount, entry.currency)}
                            </td>
                            <td className="px-4 py-3">
                              <SharedBadge expense={entry} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <PermissionGate feature="ventures.manage" action="write">
                                <button
                                  type="button"
                                  onClick={() => deleteExpense(entry.id)}
                                  className="text-cdy-muted hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {expenseEntries?.length === 0 && (
                      <p className="p-4 text-center text-cdy-muted">No expense entries</p>
                    )}
                  </div>
                )}
                {summary && (
                  <p className="text-sm text-cdy-muted">
                    Total expenses this period:{' '}
                    <span className="font-medium text-cdy-white">
                      {formatCurrency(summary.expenses.total)}
                    </span>{' '}
                    (venture&apos;s share of all costs)
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <LogIncomeDrawer
          open={incomeOpen}
          ventureId={ventureId}
          onClose={() => setIncomeOpen(false)}
        />
        {venture && (
          <LogExpenseDrawer
            open={expenseOpen}
            ventureId={ventureId}
            ventureName={venture.name}
            onClose={() => setExpenseOpen(false)}
          />
        )}
      </div>
    </FeatureReadGate>
  );
}
