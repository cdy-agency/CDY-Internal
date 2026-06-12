'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCommissions } from '@/hooks/useCommissions';
import { CommissionStatusBadge } from '@/components/finance/commissions/CommissionStatusBadge';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  currentMonthKey,
  shiftMonth,
  formatMonthKey,
  serviceTypeLabel,
} from '@/lib/reportDates';
import { FeatureReadGate } from '@/components/FeatureReadGate';

export default function MyCommissionsPage(): JSX.Element {
  const [month, setMonth] = useState(currentMonthKey());
  const { data, isLoading } = useCommissions({ month, limit: 50 }, true);

  return (
    <FeatureReadGate feature="finance.commissions.own" featureName="My Commissions">
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">My Commissions</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">My Commissions</h1>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-cdy-white">{formatMonthKey(month)}</span>
        <Button variant="outline" size="sm" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
            <p className="text-xs text-cdy-muted">Deals Closed</p>
            <p className="text-2xl font-bold text-cdy-white">{data.total}</p>
          </div>
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
            <p className="text-xs text-cdy-muted">Pending Commission</p>
            <p className="text-2xl font-bold text-amber-400">
              {formatCurrency(data.summary.pendingValue)}
            </p>
          </div>
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
            <p className="text-xs text-cdy-muted">Approved Commission</p>
            <p className="text-2xl font-bold text-[var(--cdy-success)]">
              {formatCurrency(data.summary.approvedValue)}
            </p>
          </div>
        </div>
      )}

      {isLoading && <InvoiceTableSkeleton />}

      {data && data.data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Deal ID</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium text-right">Deal Value</th>
                <th className="px-4 py-3 font-medium text-right">Commission</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 font-mono text-cdy-muted">{c.dealId}</td>
                  <td className="px-4 py-3 text-cdy-white">
                    {serviceTypeLabel(c.serviceType)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(c.dealValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {formatCurrency(c.finalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <CommissionStatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </FeatureReadGate>
  );
}
