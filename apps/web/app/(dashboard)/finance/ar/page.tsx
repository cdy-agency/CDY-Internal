'use client';

import { useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useArLedger, type ArLedgerFilters } from '@/hooks/useArLedger';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import type { ArLedgerClientRow, ArRiskLevel } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

const RISK_STYLES: Record<
  ArRiskLevel,
  { label: string; className: string; dot: string }
> = {
  HIGH: {
    label: 'HIGH',
    className: 'bg-cdy-red-light text-cdy-red',
    dot: '🔴',
  },
  MEDIUM: {
    label: 'MEDIUM',
    className: 'bg-orange-950 text-orange-400',
    dot: '🟡',
  },
  LOW: {
    label: 'LOW',
    className: 'bg-amber-950 text-amber-400',
    dot: '🟢',
  },
  CURRENT: {
    label: 'CURRENT',
    className: 'bg-cdy-navy text-cdy-muted',
    dot: '⚪',
  },
};

function RiskBadge({ level }: { level: ArRiskLevel }): JSX.Element {
  const config = RISK_STYLES[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.dot} {config.label}
    </span>
  );
}

function ReminderButton({ invoiceId }: { invoiceId: string }): JSX.Element {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function send(): Promise<void> {
    setLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/send-reminder`, {});
      toast.success('Reminder sent');
      await queryClient.invalidateQueries({ queryKey: ['ar'] });
    } catch {
      /* interceptor */
    } finally {
      setLoading(false);
    }
  }

  return (
    <PermissionGate feature="finance.invoices" action="write">
      <Button variant="outline" size="sm" onClick={send} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Reminder'}
      </Button>
    </PermissionGate>
  );
}

function exportLedgerCsv(ledger: ArLedgerClientRow[]): void {
  const headers = [
    'Client',
    'Invoice #',
    'Total',
    'Remaining',
    'Due Date',
    'Status',
    'Days Overdue',
    'Risk Level',
  ];
  const rows: string[][] = [];

  for (const client of ledger) {
    for (const inv of client.invoices) {
      rows.push([
        client.clientId,
        inv.invoiceNumber,
        String(inv.total),
        String(inv.remaining),
        inv.dueDate.split('T')[0],
        inv.status,
        String(inv.daysOverdue),
        client.riskLevel,
      ]);
    }
  }

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ar-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function ArLedgerPage(): JSX.Element {
  const [clientSearch, setClientSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [riskLevel, setRiskLevel] = useState<ArRiskLevel | ''>('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    new Set(),
  );

  const filters: ArLedgerFilters = useMemo(
    () => ({
      clientId: clientSearch || undefined,
      overdueOnly: overdueOnly || undefined,
      riskLevel: riskLevel || undefined,
    }),
    [clientSearch, overdueOnly, riskLevel],
  );

  const { data, isLoading, isError } = useArLedger(filters);

  function toggleClient(clientId: string): void {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">
          Finance
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Accounts Receivable</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-cdy-white">AR Ledger</h1>
        {data && data.ledger.length > 0 && (
          <PermissionGate feature="finance.ar" action="read">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportLedgerCsv(data.ledger)}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </PermissionGate>
        )}
      </div>

      {data && (
        <div className="grid gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-cdy-muted">Total Outstanding</p>
            <p className="text-xl font-bold text-cdy-white">
              {formatCurrency(data.totalAR)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-cdy-muted">Clients</p>
            <p className="text-xl font-bold text-cdy-white">
              {data.clientCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-cdy-muted">High Risk</p>
            <p className="text-xl font-bold text-cdy-red">
              {data.highRiskCount}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <Input
          placeholder="Search by client..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-cdy-muted">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-cdy-navy-border"
          />
          Overdue only
        </label>
        <select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value as ArRiskLevel | '')}
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">All risk levels</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="CURRENT">Current</option>
        </select>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <p className="text-center text-cdy-muted">Failed to load AR ledger</p>
      )}

      {data && !isLoading && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-center">Invoices</th>
                <th className="px-4 py-3 font-medium text-right">
                  Outstanding
                </th>
                <th className="px-4 py-3 font-medium">Oldest Due</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.ledger.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-cdy-muted"
                  >
                    No outstanding receivables
                  </td>
                </tr>
              ) : (
                data.ledger.map((client) => {
                  const expanded = expandedClients.has(client.clientId);
                  return (
                    <Fragment key={client.clientId}>
                      <tr
                        key={client.clientId}
                        className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30"
                      >
                        <td className="px-4 py-3 font-medium text-cdy-white">
                          {client.clientName}
                        </td>
                        <td className="px-4 py-3 text-center text-cdy-muted">
                          {client.invoiceCount}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-cdy-white">
                          {formatCurrency(client.totalOutstanding)}
                        </td>
                        <td className="px-4 py-3 text-cdy-muted">
                          {format(
                            new Date(client.oldestDueDate),
                            'MMM d, yyyy',
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge level={client.riskLevel} />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleClient(client.clientId)}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {expanded ? 'Collapse' : 'Expand'}
                          </Button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${client.clientId}-detail`}>
                          <td colSpan={6} className="bg-cdy-navy/20 px-4 py-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-cdy-muted">
                                  <th className="pb-2 font-medium">
                                    Invoice #
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Amount
                                  </th>
                                  <th className="pb-2 font-medium text-right">
                                    Remaining
                                  </th>
                                  <th className="pb-2 font-medium">Due Date</th>
                                  <th className="pb-2 font-medium">Status</th>
                                  <th className="pb-2 font-medium">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {client.invoices.map((inv) => (
                                  <tr
                                    key={inv.id}
                                    className="border-t border-cdy-navy-border/30"
                                  >
                                    <td className="py-2 font-mono text-cdy-white">
                                      {inv.invoiceNumber}
                                    </td>
                                    <td className="py-2 text-right text-cdy-muted">
                                      {formatCurrency(inv.total)}
                                    </td>
                                    <td className="py-2 text-right text-cdy-white">
                                      {formatCurrency(inv.remaining)}
                                    </td>
                                    <td className="py-2 text-cdy-muted">
                                      {format(
                                        new Date(inv.dueDate),
                                        'MMM d, yyyy',
                                      )}
                                    </td>
                                    <td className="py-2">
                                      <InvoiceStatusBadge status={inv.status} />
                                    </td>
                                    <td className="py-2">
                                      <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                          <Link
                                            href={`/finance/invoices/${inv.id}`}
                                          >
                                            View
                                          </Link>
                                        </Button>
                                        <ReminderButton invoiceId={inv.id} />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
