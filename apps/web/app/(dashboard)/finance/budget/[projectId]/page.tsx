'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useProjectBudget } from '@/hooks/useBudget';
import { NotFound } from '@/components/finance/NotFound';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { AxiosError } from 'axios';
import { PermissionGate } from '@/components/PermissionGate';

export default function BudgetDetailPage(): JSX.Element {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { data: budget, isLoading, isError } = useProjectBudget(params.projectId);
  const [requestedBudget, setRequestedBudget] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitIncreaseRequest(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!budget) return;
    setSubmitting(true);
    try {
      await api.post(`/budget/${budget.projectId}/increase-request`, {
        requestedBudget: parseFloat(requestedBudget),
        justification,
      });
      toast.success('Budget increase request submitted');
      setRequestedBudget('');
      setJustification('');
      await queryClient.invalidateQueries({ queryKey: ['budget', budget.projectId] });
      await queryClient.invalidateQueries({ queryKey: ['budget', 'list'] });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (isError || !budget) return <NotFound />;

  const fmt = (n: number): string => formatCurrency(n, budget.currency);
  const showRequestForm =
    (budget.isBlocked || budget.percentConsumed >= budget.alertThresholdPct) &&
    !budget.pendingRequest;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/budget" className="hover:text-cdy-white">Project Budget</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">{budget.projectName}</span>
      </nav>

      <h1 className="text-2xl font-bold text-cdy-white">{budget.projectName}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Approved Budget" value={fmt(budget.approvedBudget)} />
        <MetricCard label="Total Spent" value={fmt(budget.totalCosts)} />
        <MetricCard label="Remaining" value={fmt(budget.remainingBudget)} />
        <MetricCard label="% Consumed" value={`${budget.percentConsumed}%`} />
        <MetricCard label="Projected Final" value={fmt(budget.projectedFinalCost)} />
      </div>

      {budget.isBlocked && (
        <div className="rounded-lg border border-cdy-red/50 bg-cdy-red-light/10 p-4">
          <p className="font-medium text-cdy-red">Expense logging is blocked for this project.</p>
          <p className="mt-1 text-sm text-cdy-muted">
            The approved budget of {fmt(budget.approvedBudget)} has been exceeded.
            Submit a budget increase request to continue logging expenses.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-cdy-muted">
          <span>$0</span>
          <span>{fmt(budget.totalCosts)} spent</span>
          <span>{fmt(budget.approvedBudget)}</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-cdy-navy">
          <div
            className={`h-full ${
              budget.isBlocked || budget.percentConsumed > 100
                ? 'bg-cdy-red'
                : budget.percentConsumed >= budget.alertThresholdPct
                  ? 'bg-amber-500'
                  : 'bg-green-600'
            }`}
            style={{ width: `${Math.min(budget.percentConsumed, 100)}%` }}
          />
        </div>
        <p className="text-xs text-cdy-muted">
          Alert threshold: {budget.alertThresholdPct}%
        </p>
      </div>

      {budget.pendingRequest && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm">
          <p className="font-medium text-amber-300">Budget increase request pending review</p>
          <p className="mt-1 text-amber-100">
            Requested: {fmt(budget.pendingRequest.requestedBudget)} · Submitted{' '}
            {format(new Date(budget.pendingRequest.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      )}

      <PermissionGate feature="finance.budget" action="write">
      {showRequestForm && (
        <form onSubmit={submitIncreaseRequest} className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5 space-y-4">
          <h3 className="font-medium text-cdy-white">Request Budget Increase</h3>
          <p className="text-sm text-cdy-muted">Current budget: {fmt(budget.approvedBudget)}</p>
          <div className="space-y-2">
            <Label>Requested budget</Label>
            <Input type="number" step="0.01" min={budget.approvedBudget + 0.01} value={requestedBudget} onChange={(e) => setRequestedBudget(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Justification</Label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} required className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <Button type="submit" disabled={submitting}>Submit Request</Button>
        </form>
      )}
      </PermissionGate>

      {budget.expenses && budget.expenses.length > 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
          <h3 className="mb-4 font-medium text-cdy-white">Expense Breakdown</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="pb-2">Date</th>
                <th className="pb-2">Vendor</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {budget.expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-cdy-navy-border/50">
                  <td className="py-2 text-cdy-muted">{format(new Date(exp.date), 'MMM d, yyyy')}</td>
                  <td className="py-2 text-cdy-white">{exp.vendorName}</td>
                  <td className="py-2 text-cdy-muted">{exp.category}</td>
                  <td className="py-2 text-right text-cdy-white">{fmt(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
      <p className="text-xs uppercase text-cdy-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-cdy-white">{value}</p>
    </div>
  );
}
