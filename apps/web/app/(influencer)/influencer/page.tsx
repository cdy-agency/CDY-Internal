'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, X } from 'lucide-react';
import { useCampaigns, useCreateCampaign } from '@/hooks/useInfluencer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { ClientSearch } from '@/components/crm/ClientSearch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import api from '@/lib/api';
import type { InfluencerCampaignListItem, ClientSearchResult } from '@cdy/shared';

// ─── Config ───────────────────────────────────────────────────

const CAMPAIGN_STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  ACTIVE: { label: 'Active', icon: '🟢', color: 'text-green-400', bg: 'bg-green-900/20' },
  COMPLETED: { label: 'Complete', icon: '✅', color: 'text-cdy-muted', bg: 'bg-cdy-navy' },
  ON_HOLD: { label: 'On Hold', icon: '⏸️', color: 'text-amber-400', bg: 'bg-amber-900/20' },
  CANCELLED: { label: 'Cancelled', icon: '🚫', color: 'text-red-400', bg: 'bg-red-900/20' },
};

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];

// ─── New Campaign Drawer ──────────────────────────────────────

function NewCampaignDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const create = useCreateCampaign();
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [totalCost, setTotalCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setSelectedClient(null);
    setName('');
    setBrief('');
    setPlatforms([]);
    setBudget('');
    setCurrency('RWF');
    setTotalCost('');
    setStartDate('');
    setEndDate('');
    setError('');
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!selectedClient) { setError('Please select a client'); return; }
    if (!name.trim()) { setError('Campaign name is required'); return; }
    if (platforms.length === 0) { setError('Select at least one platform'); return; }
    if (!startDate) { setError('Start date is required'); return; }
    try {
      await create.mutateAsync({
        clientId: selectedClient.id,
        name: name.trim(),
        brief: brief.trim() || undefined,
        platforms,
        budget: budget.trim() || undefined,
        currency,
        totalCost: totalCost.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { reset(); onClose(); }}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">New Campaign</h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col overflow-y-auto p-6"
        >
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <div className="mt-1">
                <ClientSearch
                  value={selectedClient}
                  onChange={setSelectedClient}
                  placeholder="Search CRM clients..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="camp-name">Campaign name</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Product Launch"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="camp-brief">Brief (optional)</Label>
              <textarea
                id="camp-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={3}
                placeholder="What is this campaign about?"
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
            </div>

            <div>
              <Label>Platforms</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      platforms.includes(p)
                        ? 'bg-cdy-red text-white'
                        : 'border border-cdy-navy-border text-cdy-muted hover:border-cdy-red hover:text-cdy-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="camp-budget">Budget (optional)</Label>
                <Input
                  id="camp-budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="2400"
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
              <div className="w-24">
                <Label htmlFor="camp-currency">Currency</Label>
                <select
                  id="camp-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
                >
                  <option value="RWF">RWF</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="camp-totalcost">Total contract cost (optional)</Label>
              <Input
                id="camp-totalcost"
                type="number"
                min="0"
                step="0.01"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="0.00"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
              {totalCost && (
                <p className="mt-1 text-xs text-cdy-muted">A DRAFT invoice will be created automatically.</p>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="camp-start">Start date</Label>
                <Input
                  id="camp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="camp-end">End date (optional)</Label>
                <Input
                  id="camp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 border-cdy-navy-border text-cdy-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Campaign row ──────────────────────────────────────────────

function CampaignRow({
  campaign,
  onDeleteClick,
}: {
  campaign: InfluencerCampaignListItem;
  onDeleteClick: (campaign: InfluencerCampaignListItem) => void;
}): JSX.Element {
  const cfg = CAMPAIGN_STATUS_CONFIG[campaign.status] ?? CAMPAIGN_STATUS_CONFIG.ACTIVE;
  const totalDeliverables = campaign.influencers.flatMap((i) => i.deliverables).length;
  const verifiedDeliverables = campaign.influencers
    .flatMap((i) => i.deliverables)
    .filter((d) => d.status === 'VERIFIED').length;

  return (
    <tr className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50">
      <td className="px-4 py-3">
        <Link
          href={`/influencer/${campaign.id}`}
          className="font-medium text-cdy-white hover:text-cdy-red hover:underline"
        >
          {campaign.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-cdy-muted">
        {campaign.client.companyName}
      </td>
      <td className="px-4 py-3 text-sm text-cdy-muted">
        {campaign.influencers.length}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cdy-navy">
            <div
              className="h-full rounded-full bg-green-400"
              style={{
                width:
                  totalDeliverables > 0
                    ? `${Math.round((verifiedDeliverables / totalDeliverables) * 100)}%`
                    : '0%',
              }}
            />
          </div>
          <span className="text-cdy-muted">
            {verifiedDeliverables}/{totalDeliverables}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-cdy-muted">
        {campaign.budget
          ? `${campaign.currency} ${Number(campaign.budget).toLocaleString()}`
          : '—'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}
        >
          {cfg.icon} {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/influencer/${campaign.id}`}
            className="text-xs text-cdy-red hover:underline"
          >
            View →
          </Link>
          <PermissionGate feature="influencer.campaigns" action="write">
            <button
              type="button"
              onClick={() => onDeleteClick(campaign)}
              className="text-cdy-muted hover:text-red-400"
              aria-label={`Delete ${campaign.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </PermissionGate>
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function InfluencerOverviewPage(): JSX.Element {
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InfluencerCampaignListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const qc = useQueryClient();

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/influencer/campaigns/${deleteTarget.id}`);
      toast.success('Campaign deleted');
      void qc.invalidateQueries({ queryKey: ['influencer', 'campaigns'] });
    } catch {
      // axios interceptor already toasts
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const activeCount = campaigns?.filter((c) => c.status === 'ACTIVE').length ?? 0;
  const totalInfluencers =
    campaigns?.reduce((s, c) => s + c.influencers.length, 0) ?? 0;
  const pendingDeliverables =
    campaigns
      ?.flatMap((c) => c.influencers.flatMap((i) => i.deliverables))
      .filter((d) => d.status === 'PENDING' || d.status === 'SUBMITTED').length ?? 0;
  const unpaidCount =
    campaigns?.reduce(
      (s, c) => s + c.influencers.filter((i) => !i.isPaid && i.agreedFee).length,
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">
          Influencer Marketing
        </h1>
        <PermissionGate feature="influencer.campaigns" action="write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </PermissionGate>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active campaigns', value: activeCount },
          { label: 'Total influencers', value: totalInfluencers },
          { label: 'Deliverables pending', value: pendingDeliverables },
          { label: 'Unpaid influencers', value: unpaidCount },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-xs text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-cdy-white">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <div className="rounded-lg border border-red-800/30 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          Failed to load campaigns.
        </div>
      )}

      {!isLoading && campaigns && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Influencers</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-cdy-muted">
                    No campaigns yet
                  </td>
                </tr>
              )}
              {campaigns.map((c) => (
                <CampaignRow key={c.id} campaign={c} onDeleteClick={setDeleteTarget} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewCampaignDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete campaign?"
        description={`This will remove "${deleteTarget?.name ?? ''}" and its associated assignments.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
