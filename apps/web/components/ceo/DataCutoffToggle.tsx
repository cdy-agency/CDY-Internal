'use client';

import { useEffect, useRef, useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useUpdateSetting } from '@/hooks/useSettings';
import type { DataCutoffMeta } from '@cdy/shared';

interface DataCutoffToggleProps {
  meta?: DataCutoffMeta;
}

/**
 * Toggle for excluding pre-migration data (before a configurable cutoff
 * date) from CEO dashboard and Finance summary totals. Lives only here —
 * the Finance page reads the same shared setting and just shows a passive
 * indicator, so the two can never disagree with each other.
 */
export function DataCutoffToggle({ meta }: DataCutoffToggleProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [cutoffInput, setCutoffInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const updateSetting = useUpdateSetting();

  const enabled = meta?.excludeOldDataEnabled ?? false;
  const cutoff = meta?.excludeOldDataCutoff ?? null;

  useEffect(() => {
    if (open) {
      setCutoffInput(cutoff ? cutoff.slice(0, 10) : '');
    }
  }, [open, cutoff]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function toggleEnabled(): Promise<void> {
    try {
      await updateSetting.mutateAsync({
        key: 'exclude_old_data_enabled',
        value: String(!enabled),
      });
      toast.success(!enabled ? 'Excluding old data' : 'Showing all data');
    } catch {
      toast.error('Failed to update setting');
    }
  }

  async function saveCutoff(): Promise<void> {
    if (!cutoffInput) return;
    try {
      await updateSetting.mutateAsync({
        key: 'exclude_old_data_cutoff',
        value: cutoffInput,
      });
      toast.success('Cutoff date updated');
    } catch {
      toast.error('Failed to update cutoff date');
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        className={enabled ? 'border-amber-500/50 text-amber-300' : undefined}
      >
        <Filter className="h-4 w-4" />
        {enabled && cutoff
          ? `Excluding before ${format(new Date(cutoff), 'MMM d, yyyy')}`
          : 'Data filter'}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 shadow-xl">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-cdy-muted">
            Exclude pre-migration data
          </p>
          <p className="mb-3 text-xs text-cdy-muted">
            Hides records before the cutoff date from every total on this dashboard and
            the Finance summary — for data migrated from the old platform that&apos;s
            known to be wrong.
          </p>

          <label className="mb-3 flex items-center justify-between rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2">
            <span className="text-sm text-cdy-white">Enabled</span>
            <input
              type="checkbox"
              checked={enabled}
              disabled={updateSetting.isPending}
              onChange={() => void toggleEnabled()}
              className="h-4 w-4 accent-cdy-red"
            />
          </label>

          <label className="mb-1 block text-xs text-cdy-muted">Cutoff date</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={cutoffInput}
              onChange={(e) => setCutoffInput(e.target.value)}
              className="flex-1 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-1.5 text-sm text-cdy-white focus:border-blue-500 focus:outline-none"
            />
            <Button
              size="sm"
              disabled={updateSetting.isPending || !cutoffInput}
              onClick={() => void saveCutoff()}
            >
              {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-cdy-dim">
            Records dated before this day are excluded from totals whenever the filter is
            enabled.
          </p>
        </div>
      )}
    </div>
  );
}
