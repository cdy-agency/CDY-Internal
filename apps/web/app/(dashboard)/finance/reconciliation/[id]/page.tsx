'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useReconciliationDetail } from '@/hooks/useReconciliation';
import { ResolveTransactionModal } from '@/components/finance/reconciliation/ResolveTransactionModal';
import { NotFound } from '@/components/finance/NotFound';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type {
  ApiResponse,
  BankTransactionRecord,
  ReconciliationCompleteResult,
} from '@cdy/shared';
import {
  ReconciliationStatus,
  TransactionMatchStatus,
} from '@cdy/shared';
import type { AxiosError } from 'axios';

type TabFilter = 'all' | 'matched' | 'unmatched';

function MatchStatusBadge({
  status,
}: {
  status: TransactionMatchStatus;
}): JSX.Element {
  const map: Record<TransactionMatchStatus, { label: string; className: string }> =
    {
      [TransactionMatchStatus.MATCHED]: {
        label: 'Matched',
        className: 'text-[var(--cdy-success)]',
      },
      [TransactionMatchStatus.UNMATCHED]: {
        label: 'Unmatched',
        className: 'text-amber-400',
      },
      [TransactionMatchStatus.MANUALLY_RESOLVED]: {
        label: 'Resolved',
        className: 'text-blue-400',
      },
      [TransactionMatchStatus.IGNORED]: {
        label: 'Ignored',
        className: 'text-cdy-muted',
      },
    };

  const config = map[status];
  const prefix =
    status === TransactionMatchStatus.MATCHED
      ? '✅'
      : status === TransactionMatchStatus.UNMATCHED
        ? '⚠'
        : '•';

  return (
    <span className={`text-sm ${config.className}`}>
      {prefix} {config.label}
    </span>
  );
}

function formatTxAmount(tx: BankTransactionRecord): string {
  if (tx.creditAmount !== null) {
    return `+${formatCurrency(tx.creditAmount)}`;
  }
  if (tx.debitAmount !== null) {
    return `-${formatCurrency(tx.debitAmount)}`;
  }
  return formatCurrency(0);
}

export default function ReconciliationDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useReconciliationDetail(params.id);
  const [tab, setTab] = useState<TabFilter>('all');
  const [resolveTx, setResolveTx] = useState<BankTransactionRecord | null>(
    null,
  );
  const [completing, setCompleting] = useState(false);
  const [completeResult, setCompleteResult] =
    useState<ReconciliationCompleteResult | null>(null);

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    if (tab === 'matched') {
      return data.transactions.filter(
        (tx) =>
          tx.matchStatus === TransactionMatchStatus.MATCHED ||
          tx.matchStatus === TransactionMatchStatus.MANUALLY_RESOLVED,
      );
    }
    if (tab === 'unmatched') {
      return data.transactions.filter(
        (tx) => tx.matchStatus === TransactionMatchStatus.UNMATCHED,
      );
    }
    return data.transactions;
  }, [data, tab]);

  const allResolved = useMemo(() => {
    if (!data) return false;
    return data.transactions.every(
      (tx) => tx.matchStatus !== TransactionMatchStatus.UNMATCHED,
    );
  }, [data]);

  async function handleComplete(): Promise<void> {
    setCompleting(true);
    try {
      const response = await api.post<
        ApiResponse<ReconciliationCompleteResult>
      >(`/reconciliation/${params.id}/complete`, {});
      setCompleteResult(response.data.data);
      await queryClient.invalidateQueries({
        queryKey: ['reconciliation', params.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['reconciliation', 'list'] });

      if (response.data.data.status === ReconciliationStatus.COMPLETED) {
        toast.success('Reconciliation complete');
      } else {
        toast.error('Discrepancy detected — please review');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to complete reconciliation',
      );
    } finally {
      setCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <NotFound />;
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">
          Finance
        </Link>
        <span className="mx-2">/</span>
        <Link href="/finance/reconciliation" className="hover:text-cdy-white">
          Reconciliation
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">
          {format(new Date(data.periodFrom), 'MMM d')} –{' '}
          {format(new Date(data.periodTo), 'MMM d, yyyy')}
        </span>
      </nav>

      <div className="grid gap-3 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <p className="text-cdy-muted">
          Period:{' '}
          <span className="text-cdy-white">
            {format(new Date(data.periodFrom), 'MMM d')} –{' '}
            {format(new Date(data.periodTo), 'MMM d, yyyy')}
          </span>
        </p>
        <p className="text-cdy-muted">
          Transactions:{' '}
          <span className="text-cdy-white">{data.transactionCount}</span>
        </p>
        <p className="text-cdy-muted">
          Matched:{' '}
          <span className="text-cdy-white">{data.matchedCount}</span>
        </p>
        <p className="text-cdy-muted">
          Unmatched:{' '}
          <span className="text-cdy-white">{data.unmatchedCount}</span>
        </p>
        <p className="text-cdy-muted">
          Opening:{' '}
          <span className="text-cdy-white">
            {formatCurrency(data.openingBalance)}
          </span>
        </p>
        <p className="text-cdy-muted">
          Closing:{' '}
          <span className="text-cdy-white">
            {formatCurrency(data.closingBalance)}
          </span>
        </p>
      </div>

      <div className="flex gap-2 border-b border-cdy-navy-border">
        {(['all', 'matched', 'unmatched'] as TabFilter[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-cdy-red text-cdy-white'
                : 'text-cdy-muted hover:text-cdy-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Match Status</th>
              <th className="px-4 py-3 font-medium">Matched To</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30"
              >
                <td className="px-4 py-3 text-cdy-muted">
                  {format(new Date(tx.transactionDate), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-cdy-white">{tx.description}</td>
                <td className="px-4 py-3 text-right font-medium text-cdy-white">
                  {formatTxAmount(tx)}
                </td>
                <td className="px-4 py-3">
                  <MatchStatusBadge status={tx.matchStatus} />
                </td>
                <td className="px-4 py-3 text-cdy-muted">
                  {tx.matchedEntityType && tx.matchedEntityId
                    ? `${tx.matchedEntityType} ${tx.matchedEntityId.slice(0, 8)}…`
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {tx.matchStatus === TransactionMatchStatus.UNMATCHED ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResolveTx(tx)}
                    >
                      Resolve
                    </Button>
                  ) : tx.matchedEntityId ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={
                          tx.matchedEntityType === 'Payment'
                            ? `/finance/payments`
                            : `/finance/expenses`
                        }
                      >
                        View
                      </Link>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allResolved &&
        data.status === ReconciliationStatus.IN_PROGRESS && (
          <div className="flex justify-end">
            <Button onClick={handleComplete} disabled={completing}>
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Complete Reconciliation'
              )}
            </Button>
          </div>
        )}

      {completeResult && (
        <div
          className={`rounded-lg border p-4 ${
            completeResult.status === ReconciliationStatus.COMPLETED
              ? 'border-[var(--cdy-success)]/30 bg-green-950/20'
              : 'border-cdy-red/30 bg-cdy-red-light/10'
          }`}
        >
          {completeResult.status === ReconciliationStatus.COMPLETED ? (
            <p className="font-medium text-[var(--cdy-success)]">
              Reconciliation complete
            </p>
          ) : (
            <p className="font-medium text-cdy-red">Discrepancy detected</p>
          )}
          <div className="mt-2 space-y-1 text-sm text-cdy-muted">
            <p>
              System balance:{' '}
              <span className="text-cdy-white">
                {formatCurrency(completeResult.systemBalance)}
              </span>
            </p>
            <p>
              Bank balance:{' '}
              <span className="text-cdy-white">
                {formatCurrency(completeResult.bankBalance)}
              </span>
            </p>
            <p>
              Difference:{' '}
              <span className="text-cdy-white">
                {formatCurrency(completeResult.difference)}
              </span>
            </p>
          </div>
        </div>
      )}

      {resolveTx && (
        <ResolveTransactionModal
          open={Boolean(resolveTx)}
          onClose={() => setResolveTx(null)}
          statementId={params.id}
          transaction={resolveTx}
        />
      )}
    </div>
  );
}
