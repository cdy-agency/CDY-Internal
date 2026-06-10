import { Skeleton } from '@/components/ui/skeleton';

export default function FinanceLoading(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5"
          >
            <Skeleton className="mb-4 h-10 w-10 rounded-md" />
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-3 h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
