'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClientSearch } from '@/components/crm/ClientSearch';
import { useCreateMarketingClient } from '@/hooks/useMarketing';
import type { ClientSearchResult } from '@cdy/shared';
import type { AxiosError } from 'axios';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'twitter', label: 'Twitter / X' },
];

interface AddMarketingClientDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AddMarketingClientDrawer({
  open,
  onClose,
}: AddMarketingClientDrawerProps): JSX.Element | null {
  const [selectedClient, setSelectedClient] =
    useState<ClientSearchResult | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'linkedin',
  ]);
  const [postsPerMonth, setPostsPerMonth] = useState('12');
  const [retainerId, setRetainerId] = useState('');
  const [notes, setNotes] = useState('');

  const { mutateAsync, isPending } = useCreateMarketingClient();

  useEffect(() => {
    if (open) {
      setSelectedClient(null);
      setSelectedPlatforms(['instagram', 'facebook', 'linkedin']);
      setPostsPerMonth('12');
      setRetainerId('');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  function togglePlatform(key: string): void {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!selectedClient || selectedPlatforms.length === 0) return;
    try {
      await mutateAsync({
        clientId: selectedClient.id,
        platforms: selectedPlatforms,
        postsPerMonth: parseInt(postsPerMonth, 10) || 12,
        retainerId: retainerId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Marketing client set up');
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to set up marketing client',
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">
            Add Marketing Client
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-cdy-muted hover:text-cdy-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto p-6"
        >
          <div className="space-y-5">
            <div>
              <Label>CRM Client</Label>
              <div className="mt-1">
                <ClientSearch
                  value={selectedClient}
                  onChange={setSelectedClient}
                  placeholder="Search client..."
                />
              </div>
            </div>

            <div>
              <Label>Platforms</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const active = selectedPlatforms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePlatform(p.key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                          : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="posts-per-month">Posts per month</Label>
              <Input
                id="posts-per-month"
                type="number"
                min="1"
                value={postsPerMonth}
                onChange={(e) => setPostsPerMonth(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="retainer-id">
                Retainer ID (optional)
              </Label>
              <Input
                id="retainer-id"
                value={retainerId}
                onChange={(e) => setRetainerId(e.target.value)}
                placeholder="Link to Finance retainer"
              />
            </div>

            <div>
              <Label htmlFor="mc-notes">Notes (optional)</Label>
              <textarea
                id="mc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedClient || selectedPlatforms.length === 0}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Set up Marketing Client'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
