'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import type { ApiResponse } from '@cdy/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReserveTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: string;
  balanceAfter: string;
  description: string;
  reference: string | null;
  createdAt: string;
}

interface ReserveAccount {
  id: string;
  name: string;
  balance: string;
  currency: string;
  depositsThisMonth?: number;
  withdrawalsThisMonth?: number;
  transactions: ReserveTransaction[];
}

// ─── Deposit Drawer ───────────────────────────────────────────────────────────

interface DepositDrawerProps {
  open: boolean;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ReserveDepositDrawer({ open, currency, onClose, onSuccess }: DepositDrawerProps): JSX.Element | null {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setAmount('');
    setDescription('');
    setReference('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/finance/reserve/deposit', {
        amount: Number(amount),
        description: description.trim(),
        reference: reference.trim() || undefined,
      });
      toast.success('Deposit recorded');
      reset();
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to record deposit');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">Deposit to Reserve</h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="rounded-md p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount">Amount ({currency}) *</Label>
            <Input
              id="deposit-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deposit-description">Description *</Label>
            <Input
              id="deposit-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 10% set aside from Kigali Media payment"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deposit-reference">Reference (optional)</Label>
            <Input
              id="deposit-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. CDY-2026-0048 or CDY-PRJ-003"
            />
            <p className="text-xs text-cdy-muted">Link to an invoice number or project code if relevant</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-cdy-navy-border pt-4">
            <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Deposit
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Withdraw Drawer ──────────────────────────────────────────────────────────

interface WithdrawDrawerProps {
  open: boolean;
  currency: string;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

function ReserveWithdrawDrawer({ open, currency, currentBalance, onClose, onSuccess }: WithdrawDrawerProps): JSX.Element | null {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountNum = Number(amount);
  const isOverBalance = amountNum > currentBalance;
  const balanceAfter = amountNum > 0 && !isOverBalance ? currentBalance - amountNum : null;

  function reset() {
    setAmount('');
    setDescription('');
    setReference('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!amount || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (isOverBalance) {
      setError(`Cannot withdraw more than the available balance (${currency} ${currentBalance.toLocaleString()})`);
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/finance/reserve/withdraw', {
        amount: amountNum,
        description: description.trim(),
        reference: reference.trim() || undefined,
      });
      toast.success('Withdrawal recorded');
      reset();
      onSuccess();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to record withdrawal');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border p-6">
          <h2 className="text-lg font-semibold text-cdy-white">Withdraw from Reserve</h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="rounded-md p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-cdy-navy p-3">
            <p className="text-xs text-cdy-muted">Available balance</p>
            <p className="font-mono text-xl font-bold text-cdy-white">
              {currency} {currentBalance.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="withdraw-amount">Amount ({currency}) *</Label>
            <Input
              id="withdraw-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              max={currentBalance}
              className={isOverBalance ? 'border-red-500 focus-visible:ring-red-500' : ''}
              required
            />
            {isOverBalance && (
              <p className="text-xs text-red-400">Exceeds available balance</p>
            )}
            {balanceAfter !== null && (
              <p className="text-xs text-cdy-muted">
                Balance after withdrawal: {currency} {balanceAfter.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="withdraw-description">Description *</Label>
            <Input
              id="withdraw-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Emergency office rent payment"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="withdraw-reference">Reference (optional)</Label>
            <Input
              id="withdraw-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Bill number or expense reference"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-cdy-navy-border pt-4">
            <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isOverBalance}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Withdrawal
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'DEPOSIT', label: 'Deposits' },
  { key: 'WITHDRAWAL', label: 'Withdrawals' },
] as const;

export default function ReservePage(): JSX.Element {
  const queryClient = useQueryClient();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'' | 'DEPOSIT' | 'WITHDRAWAL'>('');

  const { data: account, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'reserve'],
    queryFn: async (): Promise<ReserveAccount & { depositsThisMonth: number; withdrawalsThisMonth: number }> => {
      const [accountRes, summaryRes] = await Promise.all([
        api.get<ApiResponse<ReserveAccount>>('/finance/reserve'),
        api.get<ApiResponse<{ balance: number; currency: string; depositsThisMonth: number; withdrawalsThisMonth: number }>>('/finance/reserve/summary'),
      ]);
      return {
        ...accountRes.data.data,
        depositsThisMonth: summaryRes.data.data.depositsThisMonth,
        withdrawalsThisMonth: summaryRes.data.data.withdrawalsThisMonth,
      };
    },
    staleTime: 30_000,
  });

  const balance = Number(account?.balance ?? 0);
  const currency = account?.currency ?? 'RWF';

  const filteredTransactions = (account?.transactions ?? []).filter(
    (t) => !typeFilter || t.type === typeFilter,
  );

  function handleSuccess() {
    void queryClient.invalidateQueries({ queryKey: ['finance', 'reserve'] });
    void queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    setDepositOpen(false);
    setWithdrawOpen(false);
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cdy-white">Reserve Fund</h1>
          <p className="mt-0.5 text-sm text-cdy-muted">CDY company savings and emergency fund</p>
        </div>
        <PermissionGate feature="finance.reserve" action="write">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDepositOpen(true)}>
              + Deposit
            </Button>
            <Button onClick={() => setWithdrawOpen(true)} disabled={balance <= 0}>
              − Withdraw
            </Button>
          </div>
        </PermissionGate>
      </div>

      {isError && (
        <div className="flex items-center justify-between rounded-lg border border-red-800/40 bg-red-900/10 px-4 py-3">
          <p className="text-sm text-red-400">Failed to load reserve data.</p>
          <button onClick={() => void refetch()} className="text-sm text-cdy-muted underline hover:text-cdy-white">
            Retry
          </button>
        </div>
      )}

      {/* Balance card */}
      <div className="rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6">
        <p className="mb-1 text-sm text-cdy-muted">Current balance</p>
        {isLoading ? (
          <div className="h-12 w-64 animate-pulse rounded bg-cdy-navy" />
        ) : (
          <p className="font-mono text-5xl font-bold text-cdy-white">
            {currency} {balance.toLocaleString()}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-cdy-navy-border pt-4">
          <div>
            <p className="text-xs text-cdy-dim">Deposited this month</p>
            {isLoading ? (
              <div className="mt-0.5 h-5 w-32 animate-pulse rounded bg-cdy-navy" />
            ) : (
              <p className="mt-0.5 font-mono text-lg font-semibold text-green-400">
                + {currency} {Number(account?.depositsThisMonth ?? 0).toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-cdy-dim">Withdrawn this month</p>
            {isLoading ? (
              <div className="mt-0.5 h-5 w-32 animate-pulse rounded bg-cdy-navy" />
            ) : (
              <p className="mt-0.5 font-mono text-lg font-semibold text-red-400">
                − {currency} {Number(account?.withdrawalsThisMonth ?? 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-cdy-white">
            Transaction history
          </h2>
          <div className="flex gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  typeFilter === f.key
                    ? 'bg-blue-900/40 text-blue-400'
                    : 'text-cdy-muted hover:bg-cdy-navy-light'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-cdy-navy-border bg-cdy-navy-light">
          {isLoading ? (
            <div className="space-y-px">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-cdy-navy" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-48 animate-pulse rounded bg-cdy-navy" />
                    <div className="h-3 w-24 animate-pulse rounded bg-cdy-navy" />
                  </div>
                  <div className="h-4 w-24 animate-pulse rounded bg-cdy-navy" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-cdy-muted">
              {typeFilter
                ? `No ${typeFilter.toLowerCase()}s yet.`
                : 'No transactions yet. Make the first deposit to start the reserve.'}
            </div>
          ) : (
            filteredTransactions.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i > 0 ? 'border-t border-cdy-navy-border' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    t.type === 'DEPOSIT'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {t.type === 'DEPOSIT' ? '+' : '−'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cdy-white">{t.description}</p>
                  <p className="mt-0.5 text-xs text-cdy-dim">
                    {format(new Date(t.createdAt), 'MMM d, yyyy')}
                    {t.reference && ` · ${t.reference}`}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p
                    className={`font-mono text-sm font-semibold ${
                      t.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {t.type === 'DEPOSIT' ? '+' : '−'} {currency}{' '}
                    {Number(t.amount).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-cdy-dim">
                    Balance: {currency} {Number(t.balanceAfter).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ReserveDepositDrawer
        open={depositOpen}
        currency={currency}
        onClose={() => setDepositOpen(false)}
        onSuccess={handleSuccess}
      />
      <ReserveWithdrawDrawer
        open={withdrawOpen}
        currency={currency}
        currentBalance={balance}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
