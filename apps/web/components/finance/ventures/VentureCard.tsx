'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { ventureColorHex } from '@/lib/ventureUtils';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import type { VentureCardSummary } from '@cdy/shared';

interface VentureCardProps {
  summary: VentureCardSummary;
  onLogIncome: (ventureId: string) => void;
  onLogExpense: (ventureId: string, ventureName: string) => void;
  maxIncome: number;
  maxExpense: number;
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}): JSX.Element {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cdy-navy">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function VentureCard({
  summary,
  onLogIncome,
  onLogExpense,
  maxIncome,
  maxExpense,
}: VentureCardProps): JSX.Element {
  const color = ventureColorHex(summary.venture.color);
  const isProfitable = summary.netProfit >= 0;

  return (
    <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-lg font-semibold text-cdy-white">{summary.venture.name}</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="mb-1 flex justify-between text-cdy-muted">
            <span>Income</span>
            <span className="text-cdy-white">{formatCurrency(summary.income.total)}</span>
          </div>
          <ProgressBar value={summary.income.total} max={maxIncome} color={color} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-cdy-muted">
            <span>Expenses</span>
            <span className="text-cdy-white">{formatCurrency(summary.expenses.total)}</span>
          </div>
          <ProgressBar value={summary.expenses.total} max={maxExpense} color="#EF4444" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-cdy-muted">Net</span>
          <span className={isProfitable ? 'text-green-400' : 'text-red-400'}>
            {formatCurrency(summary.netProfit)}{' '}
            {isProfitable ? '✅ Profitable' : '⚠️ Loss'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cdy-muted">Margin</span>
          <span className="text-cdy-white">{summary.margin}%</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/finance/ventures/${summary.venture.id}`}>View Details</Link>
        </Button>
        <PermissionGate feature="ventures.manage" action="write">
          <Button variant="outline" size="sm" onClick={() => onLogIncome(summary.venture.id)}>
            + Log Income
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogExpense(summary.venture.id, summary.venture.name)}
          >
            + Log Expense
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
