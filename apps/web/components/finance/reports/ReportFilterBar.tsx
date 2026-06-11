'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface DatePreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

interface ReportFilterBarProps {
  presets: DatePreset[];
  activePreset: string;
  from: string;
  to: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomChange: (from: string, to: string) => void;
  onDownloadPdf: () => void;
  pdfLoading?: boolean;
  children?: React.ReactNode;
}

export function ReportFilterBar({
  presets,
  activePreset,
  from,
  to,
  onPresetChange,
  onCustomChange,
  onDownloadPdf,
  pdfLoading,
  children,
}: ReportFilterBarProps): JSX.Element {
  return (
    <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-cdy-navy-border bg-cdy-navy px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPresetChange(preset)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activePreset === preset.id
                  ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                  : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <Input
            type="date"
            className="w-36"
            value={from}
            onChange={(e) => onCustomChange(e.target.value, to)}
          />
          <span className="text-cdy-muted">—</span>
          <Input
            type="date"
            className="w-36"
            value={to}
            onChange={(e) => onCustomChange(from, e.target.value)}
          />
          {children}
        </div>
        <Button onClick={onDownloadPdf} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Download PDF'
          )}
        </Button>
      </div>
    </div>
  );
}
