'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VENTURE_COLOR_PRESETS } from '@/lib/ventureUtils';
import type { ApiResponse, VentureRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface AddVentureDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AddVentureDrawer({ open, onClose }: AddVentureDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(VENTURE_COLOR_PRESETS[0].value);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setColor(VENTURE_COLOR_PRESETS[0].value);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post<ApiResponse<VentureRecord>>('/ventures', {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success('Venture created');
      await queryClient.invalidateQueries({ queryKey: ['ventures'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to create venture');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} role="presentation" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Add Venture</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="venture-name">Venture name</Label>
              <Input
                id="venture-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="venture-desc">Description (optional)</Label>
              <textarea
                id="venture-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label>Colour</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {VENTURE_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.name}
                    onClick={() => setColor(preset.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      color === preset.value
                        ? 'scale-110 border-cdy-white'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: `#${preset.value}` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-auto flex gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Venture'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
