import { Skeleton } from '@/components/ui/skeleton';

export function InvoiceTableSkeleton(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
      <div className="border-b border-cdy-navy-border bg-cdy-navy-light px-4 py-3">
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div
          key={row}
          className="border-b border-cdy-navy-border/50 px-4 py-4 last:border-0"
        >
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, col) => (
              <Skeleton key={col} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
