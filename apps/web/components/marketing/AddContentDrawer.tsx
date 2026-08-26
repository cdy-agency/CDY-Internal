'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateContentItem } from '@/hooks/useMarketing';
import type { AxiosError } from 'axios';

const CONTENT_TYPES = [
  { value: 'POST', label: 'Post' },
  { value: 'REEL', label: 'Reel' },
  { value: 'STORY', label: 'Story' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'AD', label: 'Ad' },
];

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter'];

interface AddContentDrawerProps {
  open: boolean;
  clientId: string;
  allowedPlatforms: string[];
  prefillDate?: string;
  onClose: () => void;
}

export function AddContentDrawer({
  open,
  clientId,
  allowedPlatforms,
  prefillDate,
  onClose,
}: AddContentDrawerProps): JSX.Element | null {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [customPlatform, setCustomPlatform] = useState('');
  const [contentType, setContentType] = useState('POST');
  const [scheduledDate, setScheduledDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { mutateAsync, isPending } = useCreateContentItem(clientId);

  const basePlatforms =
    allowedPlatforms.length > 0
      ? PLATFORMS.filter((p) => allowedPlatforms.includes(p))
      : PLATFORMS;
  // Custom platforms already picked (not in the base list) stay selectable
  // even after being added, so they show up as chips alongside the presets.
  const platformOptions = [
    ...basePlatforms,
    ...selectedPlatforms.filter((p) => !basePlatforms.includes(p)),
  ];

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setSelectedPlatforms(basePlatforms[0] ? [basePlatforms[0]] : []);
      setCustomPlatform('');
      setContentType('POST');
      setScheduledDate(
        prefillDate ?? format(new Date(), 'yyyy-MM-dd'),
      );
      setFileUrl('');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillDate]);

  if (!open) return null;

  function togglePlatform(p: string): void {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function addCustomPlatform(): void {
    const normalized = customPlatform.trim().toLowerCase();
    if (!normalized) return;
    if (!selectedPlatforms.includes(normalized)) {
      setSelectedPlatforms((prev) => [...prev, normalized]);
    }
    setCustomPlatform('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!title.trim() || selectedPlatforms.length === 0 || !scheduledDate) return;
    try {
      // One content item per selected platform — each platform's post is
      // tracked/approved/published independently (they don't all go live
      // at once), so a single combined row wouldn't fit the status workflow.
      for (const platform of selectedPlatforms) {
        await mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          platform,
          contentType,
          scheduledDate,
          fileUrl: fileUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      toast.success(
        selectedPlatforms.length > 1
          ? `${selectedPlatforms.length} content items added`
          : 'Content item added',
      );
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to add content item',
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
            Add Content Item
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="content-title">Title</Label>
              <Input
                id="content-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Platform{selectedPlatforms.length > 1 ? 's' : ''}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {platformOptions.map((p) => {
                  const active = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                        active
                          ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                          : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-muted'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomPlatform();
                    }
                  }}
                  placeholder="Add a custom platform…"
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 shrink-0"
                  onClick={addCustomPlatform}
                >
                  Add
                </Button>
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="mt-1 text-xs text-[var(--cdy-danger)]">
                  Select at least one platform
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="content-type">Type</Label>
              <select
                id="content-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="content-date">Scheduled date</Label>
              <Input
                id="content-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="content-desc">Caption / Copy (optional)</Label>
              <textarea
                id="content-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label htmlFor="content-file">File URL (optional)</Label>
              <Input
                id="content-file"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="Canva, Drive, or direct link"
              />
            </div>
            <div>
              <Label htmlFor="content-notes">Notes (optional)</Label>
              <textarea
                id="content-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
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
              disabled={isPending || selectedPlatforms.length === 0}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add to Calendar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
