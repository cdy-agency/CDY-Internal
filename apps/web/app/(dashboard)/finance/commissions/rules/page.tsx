'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useCommissionRules } from '@/hooks/useCommissionRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { serviceTypeLabel } from '@/lib/reportDates';
import type { ApiResponse, CommissionRule, CommissionRuleGroup } from '@cdy/shared';

const SERVICE_TYPES = [
  '',
  'Marketing',
  'Software Dev',
  'Design',
  'Consulting',
];

function isRuleActive(rule: CommissionRule): boolean {
  if (!rule.effectiveTo) return true;
  return new Date(rule.effectiveTo) > new Date();
}

function AddRuleDrawer({
  agents,
  onClose,
  onSaved,
}: {
  agents: { id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const [agentId, setAgentId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [effectiveTo, setEffectiveTo] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await api.post('/commissions/rules', {
        agentId,
        serviceType: serviceType || undefined,
        ratePercent: parseFloat(ratePercent),
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      });
      toast.success('Rule created');
      onSaved();
      onClose();
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">Add Commission Rule</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-cdy-muted">
            Agent
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-cdy-muted">
            Service type
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
            >
              <option value="">All services</option>
              {SERVICE_TYPES.filter(Boolean).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-cdy-muted">
            Rate (%)
            <Input
              type="number"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Effective from
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Effective to (optional)
            <Input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving || !agentId || !ratePercent}
            onClick={() => void save()}
          >
            Add Rule
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CommissionRulesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useCommissionRules();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{
    rule: CommissionRule;
    agentName: string;
  } | null>(null);

  const { data: agents } = useQuery({
    queryKey: ['commissions', 'agents'],
    queryFn: async () => {
      const res = await api.get<
        ApiResponse<{ id: string; firstName: string; lastName: string }[]>
      >('/commissions/agents');
      return res.data.data;
    },
  });

  async function deactivate(): Promise<void> {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/commissions/rules/${deactivateTarget.rule.id}`);
      toast.success('Rule deactivated');
      setDeactivateTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['commissions', 'rules'] });
    } catch {
      /* interceptor */
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/commissions" className="hover:text-cdy-white">Commissions</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Rules</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cdy-white">Commission Rules</h1>
        <Button
          className="bg-cdy-red hover:bg-cdy-red/90"
          onClick={() => setDrawerOpen(true)}
        >
          Add Rule
        </Button>
      </div>

      <div className="space-y-8">
        {(groups ?? []).map((group: CommissionRuleGroup) => (
          <div key={group.agentId}>
            <h2 className="mb-3 text-sm font-semibold text-cdy-white">
              {group.agentName}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="px-4 py-3 font-medium">Service Type</th>
                    <th className="px-4 py-3 font-medium text-right">Rate</th>
                    <th className="px-4 py-3 font-medium">Effective From</th>
                    <th className="px-4 py-3 font-medium">Effective To</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-cdy-navy-border/50">
                      <td className="px-4 py-3 text-cdy-white">
                        {rule.serviceType
                          ? serviceTypeLabel(rule.serviceType)
                          : 'All services'}
                      </td>
                      <td className="px-4 py-3 text-right text-cdy-white">
                        {rule.ratePercent}%
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {format(new Date(rule.effectiveFrom), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {rule.effectiveTo
                          ? format(new Date(rule.effectiveTo), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {isRuleActive(rule) ? 'Active' : 'Inactive'}
                      </td>
                      <td className="px-4 py-3">
                        {isRuleActive(rule) && (
                          <button
                            type="button"
                            className="text-cdy-red hover:underline"
                            onClick={() =>
                              setDeactivateTarget({
                                rule,
                                agentName: group.agentName,
                              })
                            }
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {drawerOpen && agents && (
        <AddRuleDrawer
          agents={agents}
          onClose={() => setDrawerOpen(false)}
          onSaved={() =>
            void queryClient.invalidateQueries({ queryKey: ['commissions', 'rules'] })
          }
        />
      )}

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">
              Deactivate this rule?
            </h2>
            <p className="mt-3 text-sm text-cdy-muted">
              Agent: {deactivateTarget.agentName}
              <br />
              Service:{' '}
              {deactivateTarget.rule.serviceType ?? 'All services'} (
              {deactivateTarget.rule.ratePercent}%)
            </p>
            <p className="mt-3 text-sm text-cdy-muted">
              This rule will stop applying to new deals from today. Past
              commissions calculated under this rule are unaffected.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                onClick={() => void deactivate()}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
