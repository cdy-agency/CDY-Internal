import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-cdy-navy-border/50',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
