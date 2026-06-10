import Link from 'next/link';
import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cdy-navy-light">
        <FileSearch className="h-7 w-7 text-cdy-muted" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-cdy-white">Invoice not found</h2>
      <p className="mb-6 max-w-md text-sm text-cdy-muted">
        This invoice may have been deleted or the link is incorrect.
      </p>
      <Button asChild variant="outline">
        <Link href="/finance/invoices">Back to Invoices</Link>
      </Button>
    </div>
  );
}
