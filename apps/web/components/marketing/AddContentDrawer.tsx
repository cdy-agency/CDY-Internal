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
  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('POST');
  const [scheduledDate, setScheduledDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { mutateAsync, isPending } = useCreateContentItem(clientId);

  const platforms =
    allowedPlatforms.length > 0
      ? PLATFORMS.filter((p) => allowedPlatforms.includes(p))
      : PLATFORMS;

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setPlatform(platforms[0] ?? 'instagram');
      setContentType('POST');
      setScheduledDate(
        prefillDate ?? format(new Date(), 'yyyy-MM-dd'),
      );
      setFileUrl('');
      setNotes('');
    }
  }, [open, prefillDate, platforms[0]]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!title.trim() || !platform || !scheduledDate) return;
    try {
      await mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        platform,
        contentType,
        scheduledDate,
        fileUrl: fileUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Content item added');
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="content-platform">Platform</Label>
                <select
                  id="content-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm capitalize text-cdy-white"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
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
            <Button type="submit" disabled={isPending} className="flex-1">
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
