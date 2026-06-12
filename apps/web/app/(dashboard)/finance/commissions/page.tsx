'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useCommissions } from '@/hooks/useCommissions';
import { CommissionStatusBadge } from '@/components/finance/commissions/CommissionStatusBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import {
  currentMonthKey,
  shiftMonth,
  formatMonthKey,
  serviceTypeLabel,
} from '@/lib/reportDates';
import type { ApiResponse, CommissionRecord, UserProfile } from '@cdy/shared';
import { CommissionStatus } from '@cdy/shared';
import { usePermissions } from '@/context/PermissionContext';
import { PermissionGate } from '@/components/PermissionGate';

function ReviewPopover({
  commission,
  mode,
  onClose,
  onDone,
}: {
  commission: CommissionRecord;
  mode: 'approve' | 'reject';
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  async function submit(): Promise<void> {
    setLoading(true);
    try {
      if (mode === 'approve') {
        const payload: {
          status: CommissionStatus.APPROVED;
          adjustedAmount?: number;
          adjustmentReason?: string;
        } = { status: CommissionStatus.APPROVED };
        if (adjustedAmount) {
          payload.adjustedAmount = parseFloat(adjustedAmount);
          payload.adjustmentReason = adjustmentReason;
        }
        await api.patch(`/commissions/${commission.id}/review`, payload);
        toast.success('Commission approved');
      } else {
        await api.patch(`/commissions/${commission.id}/review`, {
          status: CommissionStatus.REJECTED,
          rejectionReason,
        });
        toast.success('Commission rejected');
      }
      onDone();
      onClose();
    } catch {
      /* interceptor */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 shadow-xl">
      {mode === 'approve' ? (
        <div className="space-y-3">
          <p className="text-sm text-cdy-muted">
            Calculated: {formatCurrency(commission.calculatedAmount)}
          </p>
          <Input
            type="number"
            step="0.01"
            placeholder="Override amount (optional)"
            value={adjustedAmount}
            onChange={(e) => setAdjustedAmount(e.target.value)}
          />
          <Input
            placeholder="Reason (required if overriding)"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={submit} disabled={loading}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="Rejection reason (required)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={submit}
              disabled={loading || !rejectionReason}
            >
              Reject
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommissionsPage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthKey());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activePopover, setActivePopover] = useState<{
    id: string;
    mode: 'approve' | 'reject';
  } | null>(null);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const { data, isLoading } = useCommissions({ month, limit: 50 });
  const { canWrite, roleKey } = usePermissions();

  useEffect(() => {
    api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => {
        const profile = res.data.data;
        setUser(profile);
        if (
          profile.roleKey === 'SALES_AGENT' &&
          !profile.permissions?.['finance.commissions']?.canRead
        ) {
          router.replace('/finance/commissions/my');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function approveAll(): Promise<void> {
    if (!data) return;
    const confirmed = window.confirm(
      `This will approve ${data.summary.pending} pending commissions totalling ${formatCurrency(data.summary.pendingValue)}. Continue?`,
    );
    if (!confirmed) return;
    setApproveAllLoading(true);
    try {
      await api.patch(`/commissions/approve-all?month=${month}`);
      toast.success('All pending commissions approved');
      await queryClient.invalidateQueries({ queryKey: ['commissions'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    } catch {
      /* interceptor */
    } finally {
      setApproveAllLoading(false);
    }
  }

  if (roleKey === 'SALES_AGENT' && !canWrite('finance.commissions')) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-cdy-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Commissions</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-cdy-white">{formatMonthKey(month)}</span>
          <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <PermissionGate feature="finance.commissions" action="write">
          <Link href="/finance/commissions/rules">
            <Button variant="outline" size="sm">Manage Rules</Button>
          </Link>
        </PermissionGate>
        </div>
        <PermissionGate feature="finance.commissions" action="write">
        {data && data.summary.pending > 0 && (
          <Button onClick={approveAll} disabled={approveAllLoading}>
            {approveAllLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Approve All Pending'
            )}
          </Button>
        )}
        </PermissionGate>
      </div>

      {data && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-4 py-3 text-sm text-cdy-muted">
          Total: {data.total} | Pending: {data.summary.pending} (
          {formatCurrency(data.summary.pendingValue)}) | Approved:{' '}
          {data.summary.approved} ({formatCurrency(data.summary.approvedValue)})
        </div>
      )}

      {isLoading && <InvoiceTableSkeleton />}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Deal ID</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium text-right">Deal Value</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
                <th className="px-4 py-3 font-medium text-right">Calculated</th>
                <th className="px-4 py-3 font-medium text-right">Adjusted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">
                    {c.agent
                      ? `${c.agent.firstName} ${c.agent.lastName}`
                      : c.agentId}
                  </td>
                  <td className="px-4 py-3 font-mono text-cdy-muted">{c.dealId}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-cdy-navy-border px-2 py-0.5 text-xs">
                      {serviceTypeLabel(c.serviceType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-cdy-white">
                    {formatCurrency(c.dealValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-muted">
                    {c.ratePercent}%
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(c.calculatedAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-muted">
                    {c.adjustedAmount !== null
                      ? formatCurrency(c.adjustedAmount)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <CommissionStatusBadge status={c.status} />
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    {c.status === CommissionStatus.PENDING && (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActivePopover({ id: c.id, mode: 'approve' })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--cdy-danger)]"
                          onClick={() =>
                            setActivePopover({ id: c.id, mode: 'reject' })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {activePopover?.id === c.id && (
                      <ReviewPopover
                        commission={c}
                        mode={activePopover.mode}
                        onClose={() => setActivePopover(null)}
                        onDone={() =>
                          queryClient.invalidateQueries({
                            queryKey: ['commissions'],
                          })
                        }
                      />
                    )}
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
