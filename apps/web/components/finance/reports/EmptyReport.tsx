import { BarChart3 } from 'lucide-react';

export function EmptyReport(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-cdy-navy-border bg-cdy-navy-light py-16 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-cdy-muted" />
      <h3 className="text-lg font-medium text-cdy-white">No data for this period</h3>
      <p className="mt-2 text-sm text-cdy-muted">Try a different date range</p>
    </div>
  );
}
