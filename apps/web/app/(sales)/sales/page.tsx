'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalesCampaigns, useCreateSalesCampaign } from '@/hooks/useSales';
import { PermissionGate } from '@/components/PermissionGate';
import type { SalesCampaignStatus } from '@cdy/shared';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-900/30 text-green-400 border border-green-800' },
  COMPLETED: { label: 'Complete', className: 'bg-blue-900/30 text-blue-400 border border-blue-800' },
  ON_HOLD: { label: 'On Hold', className: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-900/30 text-cdy-red border border-red-800' },
};

function ClientSearch({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; companyName: string }[]>([]);
  const [selected, setSelected] = useState('');

  async function search(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/proxy/crm/clients?search=${encodeURIComponent(q)}&limit=10`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setResults(data?.data ?? []);
    } catch { setResults([]); }
  }

  function pick(client: { id: string; companyName: string }) {
    setSelected(client.companyName);
    setQuery(client.companyName);
    setResults([]);
    onChange(client.id, client.companyName);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => void search(e.target.value)}
        placeholder="Search CRM clients..."
        className="bg-cdy-navy border-cdy-navy-border text-cdy-white"
      />
      {results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light shadow-lg">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-cdy-white hover:bg-cdy-navy"
              onClick={() => pick(c)}
            >
              {c.companyName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewCampaignDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCampaign = useCreateSalesCampaign();
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [productService, setProductService] = useState('');
  const [territory, setTerritory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visitTarget, setVisitTarget] = useState('');
  const [leadTarget, setLeadTarget] = useState('');
  const [salesTarget, setSalesTarget] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [notes, setNotes] = useState('');

  function reset() {
    setClientId(''); setName(''); setProductService(''); setTerritory('');
    setStartDate(''); setEndDate(''); setVisitTarget(''); setLeadTarget('');
    setSalesTarget(''); setTotalCost(''); setCurrency('RWF'); setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !name || !productService || !startDate) return;
    await createCampaign.mutateAsync({
      clientId, name, productService,
      territory: territory || undefined,
      startDate,
      endDate: endDate || undefined,
      visitTarget: visitTarget ? Number(visitTarget) : undefined,
      leadTarget: leadTarget ? Number(leadTarget) : undefined,
      salesTarget: salesTarget ? Number(salesTarget) : undefined,
      totalCost: totalCost || undefined,
      currency: totalCost ? currency : undefined,
      notes: notes || undefined,
    });
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-y-auto bg-cdy-navy-light shadow-xl">
        <div className="border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">New Sales Campaign</h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          <div className="space-y-1">
            <Label className="text-cdy-muted">Client</Label>
            <ClientSearch value={clientId} onChange={(id) => setClientId(id)} />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Campaign name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required
              className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Product / service being sold</Label>
            <Input value={productService} onChange={(e) => setProductService(e.target.value)} required
              className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Territory (optional)</Label>
            <Input value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="Geographic area"
              className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-cdy-muted">Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-cdy-muted">Visit target</Label>
              <Input type="number" min="0" value={visitTarget} onChange={(e) => setVisitTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted">Lead target</Label>
              <Input type="number" min="0" value={leadTarget} onChange={(e) => setLeadTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-cdy-muted">Sales target</Label>
              <Input type="number" min="0" value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Total contract cost (optional)</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" step="0.01" value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)} placeholder="0.00"
                className="flex-1 bg-cdy-navy border-cdy-navy-border text-cdy-white" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-24 rounded-md border border-cdy-navy-border bg-cdy-navy px-2 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red">
                <option value="RWF">RWF</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            {totalCost && (
              <p className="text-xs text-cdy-muted">A DRAFT invoice will be created automatically.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Notes</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-cdy-muted">Cancel</Button>
            <Button type="submit" disabled={createCampaign.isPending} className="bg-cdy-red text-white hover:bg-cdy-red/90">
              {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalesCampaignsPage() {
  const { data: campaigns, isLoading } = useSalesCampaigns();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const active = campaigns?.filter((c) => c.status === 'ACTIVE') ?? [];
  const totalAgents = campaigns?.reduce((s, c) => s + c._count.agents, 0) ?? 0;

  const summaryCards = [
    { label: 'Active campaigns', value: active.length },
    { label: 'Total campaigns', value: campaigns?.length ?? 0 },
    { label: 'Field agents', value: totalAgents },
    { label: 'Total logs', value: campaigns?.reduce((s, c) => s + c._count.dailyLogs, 0) ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cdy-white">Sales Campaigns</h1>
          <p className="text-sm text-cdy-muted">Field sales team management</p>
        </div>
        <PermissionGate feature="sales.campaigns" action="write">
          <Button onClick={() => setDrawerOpen(true)} className="bg-cdy-red text-white hover:bg-cdy-red/90">
            <Plus className="mr-2 h-4 w-4" /> New Campaign
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
            <p className="text-xs text-cdy-muted">{card.label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-cdy-white">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <div className="border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-sm font-semibold text-cdy-white">All Campaigns</h2>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !campaigns?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-cdy-muted">
            <TrendingUp className="h-10 w-10 opacity-30" />
            <p className="text-sm">No campaigns yet. Create your first campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-xs text-cdy-muted">
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3 text-right">Agents</th>
                  <th className="px-6 py-3 text-right">Logs</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG['ACTIVE'];
                  return (
                    <tr key={c.id} className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                      <td className="px-6 py-4">
                        <Link href={`/sales/${c.id}`} className="font-medium text-cdy-white hover:text-cdy-red">
                          {c.name}
                        </Link>
                        {c.territory && (
                          <p className="text-xs text-cdy-muted">{c.territory}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-cdy-muted">{c.client.companyName}</td>
                      <td className="px-6 py-4 text-cdy-muted">{c.productService}</td>
                      <td className="px-6 py-4 text-right text-cdy-white">{c._count.agents}</td>
                      <td className="px-6 py-4 text-right text-cdy-white">{c._count.dailyLogs}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewCampaignDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
