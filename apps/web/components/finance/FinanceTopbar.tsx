'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinanceTopbarProps {
  title: string;
  breadcrumb?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function FinanceTopbar({
  title,
  breadcrumb = 'Finance',
  actionLabel,
  onAction,
}: FinanceTopbarProps): JSX.Element {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-cdy-navy-border bg-cdy-navy px-6 py-4">
      <div>
        <div className="mb-1 flex items-center gap-1 text-sm text-cdy-muted">
          <span>{breadcrumb}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-cdy-white">{title}</span>
        </div>
        <h1 className="text-xl font-semibold text-cdy-white">{title}</h1>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </header>
  );
}
