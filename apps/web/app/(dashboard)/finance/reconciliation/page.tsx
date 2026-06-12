'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ImportStatementModal } from '@/components/finance/reconciliation/ImportStatementModal';
import { useReconciliationList } from '@/hooks/useReconciliation';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { ReconciliationStatus } from '@cdy/shared';
import { PermissionGate } from '@/components/PermissionGate';

function StatusBadge({ status }: { status: ReconciliationStatus }): JSX.Element {
  const config: Record<
    ReconciliationStatus,
    { label: string; className: string }
  > = {
    [ReconciliationStatus.IN_PROGRESS]: {
      label: 'In Progress',
      className: 'text-amber-400',
    },
    [ReconciliationStatus.COMPLETED]: {
      label: 'Completed',
      className: 'text-[var(--cdy-success)]',
    },
    [ReconciliationStatus.DISCREPANCY]: {
      label: 'Discrepancy',
      className: 'text-cdy-red',
    },
  };

  const { label, className } = config[status];
  const prefix =
    status === ReconciliationStatus.COMPLETED
      ? '✅'
      : status === ReconciliationStatus.DISCREPANCY
        ? '⚠'
        : '⏳';

  return (
    <span className={`text-sm ${className}`}>
      {prefix} {label}
    </span>
  );
}

export default function ReconciliationListPage(): JSX.Element {
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading, isError } = useReconciliationList();

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">
          Finance
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Bank Reconciliation</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-cdy-white">
          Bank Reconciliation
        </h1>
        <PermissionGate feature="finance.reconciliation" action="write">
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            onClick={() => setImportOpen(true)}
          >
            Import Statement
          </Button>
        </PermissionGate>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {isError && (
        <p className="text-center text-cdy-muted">
          Failed to load reconciliation history
        </p>
      )}

      {data && !isLoading && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Imported</th>
                <th className="px-4 py-3 font-medium text-center">
                  Transactions
                </th>
                <th className="px-4 py-3 font-medium text-center">Matched</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-cdy-muted"
                  >
                    No reconciliation runs yet. Import a bank statement to get
                    started.
                  </td>
                </tr>
              ) : (
                data.map((stmt) => (
                  <tr
                    key={stmt.id}
                    className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30"
                  >
                    <td className="px-4 py-3 text-cdy-white">
                      {format(new Date(stmt.periodFrom), 'MMM d')} –{' '}
                      {format(new Date(stmt.periodTo), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-cdy-muted">
                      {format(new Date(stmt.importedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center text-cdy-muted">
                      {stmt.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-center text-cdy-white">
                      {stmt.matchedCount}/{stmt.transactionCount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={stmt.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/finance/reconciliation/${stmt.id}`}>
                          {stmt.status === ReconciliationStatus.IN_PROGRESS
                            ? 'Continue'
                            : 'Review'}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ImportStatementModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
