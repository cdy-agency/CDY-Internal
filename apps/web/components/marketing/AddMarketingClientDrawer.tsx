'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RetainerSearch } from '@/components/finance/RetainerSearch';
import { useCreateMarketingClient } from '@/hooks/useMarketing';
import type { RetainerSearchResult } from '@/components/finance/RetainerSearch';
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
  const [selectedRetainer, setSelectedRetainer] = useState<RetainerSearchResult | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'linkedin',
  ]);
  const [postsPerMonth, setPostsPerMonth] = useState('12');
  const [notes, setNotes] = useState('');

  const { mutateAsync, isPending } = useCreateMarketingClient();

  useEffect(() => {
    if (open) {
      setSelectedRetainer(null);
      setSelectedPlatforms(['instagram', 'facebook', 'linkedin']);
      setPostsPerMonth('12');
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
    if (!selectedRetainer || selectedPlatforms.length === 0) return;
    try {
      await mutateAsync({
        retainerId: selectedRetainer.id,
        platforms: selectedPlatforms,
        postsPerMonth: parseInt(postsPerMonth, 10) || 12,
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
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col overflow-y-auto p-6"
        >
          <div className="space-y-5">
            <div>
              <Label>Retainer contract</Label>
              <div className="mt-1">
                <RetainerSearch
                  value={selectedRetainer}
                  onChange={setSelectedRetainer}
                  placeholder="Search active retainers…"
                />
              </div>
              {selectedRetainer && (
                <p className="mt-1.5 text-xs text-green-400">
                  Client: {selectedRetainer.clientName ?? selectedRetainer.clientId}
                </p>
              )}
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
              disabled={isPending || !selectedRetainer || selectedPlatforms.length === 0}
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
