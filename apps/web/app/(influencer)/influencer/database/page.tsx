'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { useInfluencers, useInfluencer, useCreateInfluencer } from '@/hooks/useInfluencer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { Skeleton } from '@/components/ui/skeleton';
import type { InfluencerDetail, InfluencerWithCount } from '@cdy/shared';

// ─── Config ───────────────────────────────────────────────────

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];
const CATEGORIES = ['lifestyle', 'tech', 'food', 'fashion', 'business', 'sports', 'other'];

// ─── Add Influencer drawer ─────────────────────────────────────

function AddInfluencerDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const create = useCreateInfluencer();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [otherPlatforms, setOtherPlatforms] = useState<string[]>([]);
  const [followersCount, setFollowersCount] = useState('');
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setName(''); setHandle(''); setPlatform('instagram');
    setOtherPlatforms([]); setFollowersCount(''); setCategory('');
    setEmail(''); setPhone(''); setLocation(''); setNotes(''); setError('');
  }

  function toggleOther(p: string) {
    setOtherPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!handle.trim()) { setError('Handle is required'); return; }
    try {
      await create.mutateAsync({
        name: name.trim(),
        handle: handle.trim(),
        platform,
        otherPlatforms: otherPlatforms.filter((p) => p !== platform),
        followersCount: followersCount ? parseInt(followersCount, 10) : undefined,
        category: category || undefined,
        email: email || undefined,
        phone: phone || undefined,
        location: location || undefined,
        notes: notes || undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add influencer');
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
          <h2 className="text-lg font-semibold text-cdy-white">Add Influencer</h2>
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
              <Label htmlFor="inf-name">Name</Label>
              <Input
                id="inf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grace Uwimana"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="inf-handle">Handle / username</Label>
              <Input
                id="inf-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@kigali_lifestyle"
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div>
              <Label htmlFor="inf-platform">Primary platform</Label>
              <select
                id="inf-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm capitalize text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Other platforms</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.filter((p) => p !== platform).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleOther(p)}
                    className={`rounded-md px-3 py-1 text-xs capitalize ${
                      otherPlatforms.includes(p)
                        ? 'bg-cdy-red text-white'
                        : 'border border-cdy-navy-border text-cdy-muted hover:border-cdy-red'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="inf-followers">Followers</Label>
                <Input
                  id="inf-followers"
                  type="number"
                  value={followersCount}
                  onChange={(e) => setFollowersCount(e.target.value)}
                  placeholder="45000"
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="inf-category">Category</Label>
                <select
                  id="inf-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm capitalize text-cdy-white focus:outline-none focus:ring-1 focus:ring-cdy-red"
                >
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="inf-email">Email (optional)</Label>
              <Input
                id="inf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="inf-phone">Phone</Label>
                <Input
                  id="inf-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="inf-location">Location</Label>
                <Input
                  id="inf-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kigali, Rwanda"
                  className="mt-1 border-cdy-navy-border bg-cdy-navy text-cdy-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="inf-notes">Notes (optional)</Label>
              <textarea
                id="inf-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
              />
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
              {create.isPending ? 'Adding…' : 'Add Influencer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail side panel ─────────────────────────────────────────

function InfluencerDetailPanel({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): JSX.Element {
  const { data: inf, isLoading } = useInfluencer(id);

  const totalEarned = inf?.assignments.reduce((sum, a) => {
    if (a.isPaid && a.agreedFee) return sum + parseFloat(a.agreedFee);
    return sum;
  }, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-5 py-4">
          <h3 className="font-semibold text-cdy-white">
            {isLoading ? 'Loading…' : (inf?.name ?? '')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {inf && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-cdy-white">{inf.handle}</p>
                <p className="mt-0.5 text-xs capitalize text-cdy-muted">
                  {inf.platform}
                  {inf.followersCount
                    ? ` · ${(inf.followersCount / 1000).toFixed(0)}K followers`
                    : ''}
                </p>
                {inf.category && (
                  <p className="text-xs capitalize text-cdy-muted">{inf.category}</p>
                )}
                {inf.location && (
                  <p className="text-xs text-cdy-muted">{inf.location}</p>
                )}
                {inf.email && (
                  <p className="mt-1 text-xs text-cdy-muted">{inf.email}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-cdy-white">Campaign history</p>
                {inf.assignments.length === 0 && (
                  <p className="mt-1 text-xs text-cdy-muted">No campaigns yet</p>
                )}
                <div className="mt-2 space-y-2">
                  {inf.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-md border border-cdy-navy-border p-2.5 text-xs"
                    >
                      <p className="font-medium text-cdy-white">{a.campaign.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-cdy-muted">
                        <span>
                          {format(new Date(a.campaign.startDate), 'MMM yyyy')}
                        </span>
                        {a.agreedFee && (
                          <span>
                            ${a.agreedFee}
                          </span>
                        )}
                        <span>
                          {a.deliverables.length} deliverable
                          {a.deliverables.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {totalEarned > 0 && (
                <div className="rounded-md border border-cdy-navy-border bg-cdy-navy p-3 text-sm">
                  <span className="text-cdy-muted">Total earned from CDY: </span>
                  <span className="font-semibold text-cdy-white">
                    ${totalEarned.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function InfluencerDatabasePage(): JSX.Element {
  const [platformFilter, setPlatformFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: influencers, isLoading } = useInfluencers({
    platform: platformFilter || undefined,
    category: categoryFilter || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">
          Influencer Database
        </h1>
        <PermissionGate feature="influencer.database" action="write">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Influencer
          </Button>
        </PermissionGate>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm capitalize text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm capitalize text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or handle…"
          className="w-52 border-cdy-navy-border bg-cdy-navy text-cdy-white"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Handle</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Followers</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Campaigns</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {influencers?.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-cdy-muted"
                  >
                    No influencers found
                  </td>
                </tr>
              )}
              {influencers?.map((inf: InfluencerWithCount) => (
                <tr
                  key={inf.id}
                  className="cursor-pointer border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/60"
                  onClick={() => setSelectedId(inf.id)}
                >
                  <td className="px-4 py-3 font-medium text-cdy-white">
                    {inf.name}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{inf.handle}</td>
                  <td className="px-4 py-3 capitalize text-cdy-muted">
                    {inf.platform}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {inf.followersCount
                      ? `${(inf.followersCount / 1000).toFixed(0)}K`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 capitalize text-cdy-muted">
                    {inf.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {inf._count.assignments}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-900/20 px-2 py-0.5 text-xs text-green-400">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddInfluencerDrawer open={addOpen} onClose={() => setAddOpen(false)} />

      {selectedId && (
        <InfluencerDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
