'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useRetainers, useRetainerSummary } from '@/hooks/useRetainers';
import { RetainerDrawer } from '@/components/finance/retainers/RetainerDrawer';
import { AmendRetainerModal } from '@/components/finance/retainers/AmendRetainerModal';
import { ExtendRetainerDrawer } from '@/components/finance/retainers/ExtendRetainerDrawer';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { RetainerStatus, type RetainerRecord } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

function StatusBadge({ status }: { status: RetainerStatus }): JSX.Element {
  const map: Record<RetainerStatus, { label: string; className: string }> = {
    [RetainerStatus.DRAFT]: { label: 'Draft', className: 'bg-cdy-navy text-cdy-muted' },
    [RetainerStatus.ACTIVE]: { label: 'Active', className: 'bg-green-950 text-green-400' },
    [RetainerStatus.PAUSED]: { label: 'Paused', className: 'bg-amber-950 text-amber-400' },
    [RetainerStatus.ENDED]: { label: 'Ended', className: 'bg-cdy-navy text-cdy-dim' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-cdy-navy text-cdy-muted' };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function RetainerRow({ retainer }: { retainer: RetainerRecord }): JSX.Element {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function pause(): Promise<void> {
    const reason = window.prompt('Reason for pausing:');
    if (!reason?.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/retainers/${retainer.id}/pause`, { reason });
      toast.success('Retainer paused');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
    } catch { /* */ } finally { setActionLoading(false); }
  }

  async function resume(): Promise<void> {
    setActionLoading(true);
    try {
      await api.post(`/retainers/${retainer.id}/resume`, {});
      toast.success('Retainer resumed');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
    } catch { /* */ } finally { setActionLoading(false); }
  }

  async function end(): Promise<void> {
    const reason = window.prompt('Reason for ending contract:');
    if (!reason?.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/retainers/${retainer.id}/end`, { reason });
      toast.success('Retainer ended');
      await queryClient.invalidateQueries({ queryKey: ['retainers'] });
    } catch { /* */ } finally { setActionLoading(false); }
  }

  return (
    <Fragment>
      <tr className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30">
        <td className="px-4 py-3 text-cdy-white">{retainer.clientName ?? retainer.clientId}</td>
        <td className="px-4 py-3 text-cdy-white">{retainer.serviceName}</td>
        <td className="px-4 py-3 text-right text-cdy-white">
          {formatCurrency(retainer.amount, retainer.currency)}
        </td>
        <td className="px-4 py-3 text-center text-cdy-muted">{retainer.billingDayOfMonth}</td>
        <td className="px-4 py-3 text-cdy-muted">
          {format(new Date(retainer.nextBillingDate), 'MMM d, yyyy')}
        </td>
        <td className="px-4 py-3"><StatusBadge status={retainer.status} /></td>
        <td className="px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-cdy-navy/20 px-4 py-4">
            <div className="space-y-3 text-sm">
              <p className="text-cdy-muted">
                Start: {format(new Date(retainer.startDate), 'MMM d, yyyy')}
                {retainer.endDate && ` · Ends: ${format(new Date(retainer.endDate), 'MMM d, yyyy')}`}
                {(retainer.extensionCount ?? 0) > 0 && (
                  <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                    Extended ×{retainer.extensionCount}
                  </span>
                )}
              </p>
              <PermissionGate feature="finance.retainers" action="write">
                <div className="flex flex-wrap gap-2">
                  {retainer.status === RetainerStatus.ACTIVE && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)}>Extend Contract</Button>
                      <Button variant="outline" size="sm" onClick={() => setAmendOpen(true)}>Amend</Button>
                      <Button variant="outline" size="sm" onClick={pause} disabled={actionLoading}>Pause</Button>
                      <Button variant="outline" size="sm" onClick={end} disabled={actionLoading}>End Contract</Button>
                    </>
                  )}
                  {retainer.status === RetainerStatus.PAUSED && (
                    <Button variant="outline" size="sm" onClick={resume} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resume'}
                    </Button>
                  )}
                </div>
              </PermissionGate>
            </div>
          </td>
        </tr>
      )}
      <AmendRetainerModal open={amendOpen} onClose={() => setAmendOpen(false)} retainer={retainer} />
      <ExtendRetainerDrawer open={extendOpen} onClose={() => setExtendOpen(false)} retainer={retainer} />
    </Fragment>
  );
}

export default function RetainersPage(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: retainers, isLoading } = useRetainers();
  const { data: summary } = useRetainerSummary();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Retainers</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cdy-white">Recurring Revenue</h1>
        <PermissionGate feature="finance.retainers" action="write">
          <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setDrawerOpen(true)}>
            Add Retainer
          </Button>
        </PermissionGate>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Active Retainers" value={String(summary.activeCount)} />
          <SummaryCard label="Monthly Recurring Revenue" value={formatCurrency(summary.totalMRR)} />
          <SummaryCard label="Annual Recurring Revenue" value={formatCurrency(summary.totalARR)} />
          <SummaryCard
            label="Up for Renewal"
            value={`${summary.upForRenewal.length} (in 30 days)`}
          />
        </div>
      )}

      {summary && summary.upForRenewal.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
          <h3 className="mb-2 font-medium text-amber-300">Contracts ending within 30 days</h3>
          <ul className="space-y-1 text-sm text-amber-100">
            {summary.upForRenewal.map((r) => (
              <li key={r.id}>
                {r.clientName ?? r.clientId} — {r.serviceName} — ends{' '}
                {r.endDate ? format(new Date(r.endDate), 'MMM d, yyyy') : '—'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && <InvoiceTableSkeleton />}

      {retainers && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium text-right">Amount/mo</th>
                <th className="px-4 py-3 font-medium text-center">Billing Day</th>
                <th className="px-4 py-3 font-medium">Next Invoice</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {retainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-cdy-muted">
                    No retainer contracts yet
                  </td>
                </tr>
              ) : (
                retainers.map((r) => <RetainerRow key={r.id} retainer={r} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      <RetainerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
      <p className="text-xs uppercase text-cdy-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-cdy-white">{value}</p>
    </div>
  );
}
