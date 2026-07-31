'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, subDays, startOfWeek, getISOWeek, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeekPickerPopoverProps {
  onDownload: (weekStart: Date) => Promise<void>;
  label?: string;
}

export function WeekPickerPopover({
  onDownload,
  label = 'Download Calendar',
}: WeekPickerPopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [downloading, setDownloading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const weekEnd = addDays(weekStart, 6);
  const weekNumber = getISOWeek(weekStart);

  async function handleDownload(): Promise<void> {
    setDownloading(true);
    try {
      await onDownload(weekStart);
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)}>
        <Download className="h-4 w-4" />
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 shadow-xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-cdy-muted">
            Select week
          </p>
          <div className="flex items-center justify-between gap-2 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2">
            <button
              type="button"
              onClick={() => setWeekStart((w) => subDays(w, 7))}
              className="text-cdy-muted hover:text-cdy-white"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-cdy-white">Week {weekNumber}</p>
              <p className="text-xs text-cdy-muted">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="text-cdy-muted hover:text-cdy-white"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="mt-3 w-full"
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
          </Button>
        </div>
      )}
    </div>
  );
}
