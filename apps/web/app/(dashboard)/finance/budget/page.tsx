'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useProjectBudgets, usePendingBudgetRequests } from '@/hooks/useBudget';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { AxiosError } from 'axios';

function ProgressBar({
  percent,
  threshold,
  blocked,
}: {
  percent: number;
  threshold: number;
  blocked: boolean;
}): JSX.Element {
  const color =
    blocked || percent > 100
      ? 'bg-cdy-red'
      : percent >= threshold
        ? 'bg-amber-500'
        : 'bg-green-600';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-cdy-navy">
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm text-cdy-white">
        {blocked && '🔒 '}
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}

export default function BudgetListPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: budgets, isLoading } = useProjectBudgets();
  const { data: pending } = usePendingBudgetRequests();
  const [formOpen, setFormOpen] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [approvedBudget, setApprovedBudget] = useState('');
  const [saving, setSaving] = useState(false);

  async function createBudget(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/budget', {
        projectId,
        projectName,
        clientId,
        approvedBudget: parseFloat(approvedBudget),
      });
      toast.success('Project budget created');
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['budget'] });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Project Budget</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cdy-white">Project Budgets</h1>
        <Button onClick={() => setFormOpen(!formOpen)}>Add Project Budget</Button>
      </div>

      {pending && pending.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">
          {pending.length} budget increase request{pending.length > 1 ? 's' : ''} pending review
        </div>
      )}

      {formOpen && (
        <form onSubmit={createBudget} className="grid gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Project ID</Label>
            <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Approved budget</Label>
            <Input type="number" step="0.01" min="0.01" value={approvedBudget} onChange={(e) => setApprovedBudget(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>Create Budget</Button>
          </div>
        </form>
      )}

      {isLoading && <InvoiceTableSkeleton />}

      {budgets && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium text-right">Budget</th>
                <th className="px-4 py-3 font-medium text-right">Spent</th>
                <th className="px-4 py-3 font-medium">%</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-cdy-muted">
                    No project budgets yet
                  </td>
                </tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.projectId} className="border-b border-cdy-navy-border/50">
                    <td className="px-4 py-3 text-cdy-white">{b.projectName}</td>
                    <td className="px-4 py-3 text-cdy-muted">{b.clientId}</td>
                    <td className="px-4 py-3 text-right text-cdy-white">
                      {formatCurrency(b.approvedBudget, b.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-cdy-white">
                      {formatCurrency(b.totalCosts, b.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        percent={b.percentConsumed}
                        threshold={b.alertThresholdPct}
                        blocked={b.isBlocked}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {b.isBlocked ? (
                        <span className="text-cdy-red">Blocked</span>
                      ) : b.percentConsumed >= b.alertThresholdPct ? (
                        <span className="text-amber-400">Alert</span>
                      ) : (
                        <span className="text-[var(--cdy-success)]">On track</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/finance/budget/${b.projectId}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
