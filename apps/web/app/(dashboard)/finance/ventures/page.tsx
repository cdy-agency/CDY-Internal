'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAllVenturesSummary } from '@/hooks/useVentures';
import { AddVentureDrawer } from '@/components/finance/ventures/AddVentureDrawer';
import { VentureCard } from '@/components/finance/ventures/VentureCard';
import { LogIncomeDrawer } from '@/components/finance/ventures/LogIncomeDrawer';
import { LogExpenseDrawer } from '@/components/finance/ventures/LogExpenseDrawer';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { formatCurrency } from '@/lib/utils';
import { buildVenturePresets } from '@/lib/ventureUtils';

const presets = buildVenturePresets();

export default function VenturesOverviewPage(): JSX.Element {
  const [activePreset, setActivePreset] = useState('this-month');
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [addOpen, setAddOpen] = useState(false);
  const [incomeVentureId, setIncomeVentureId] = useState<string | null>(null);
  const [expenseTarget, setExpenseTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, isError } = useAllVenturesSummary({ from, to });

  const maxIncome = Math.max(
    ...(data?.ventures.map((v) => v.income.total) ?? [0]),
    1,
  );
  const maxExpense = Math.max(
    ...(data?.ventures.map((v) => v.expenses.total) ?? [0]),
    1,
  );

  return (
    <FeatureReadGate feature="ventures.view" featureName="Ventures">
      <div className="space-y-6">
        <nav className="text-sm text-cdy-muted">
          <Link href="/finance" className="hover:text-cdy-white">
            Finance
          </Link>
          <span className="mx-2">/</span>
          <span className="text-cdy-white">Ventures</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-cdy-white">Ventures</h1>
          <PermissionGate feature="ventures.manage" action="write">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Venture
            </Button>
          </PermissionGate>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActivePreset(preset.id);
                setFrom(preset.from);
                setTo(preset.to);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activePreset === preset.id
                  ? 'border-cdy-red bg-cdy-red-light text-cdy-red'
                  : 'border-cdy-navy-border text-cdy-muted hover:text-cdy-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <Input
            type="date"
            className="w-36"
            value={from}
            onChange={(e) => {
              setActivePreset('custom');
              setFrom(e.target.value);
            }}
          />
          <span className="text-cdy-muted">—</span>
          <Input
            type="date"
            className="w-36"
            value={to}
            onChange={(e) => {
              setActivePreset('custom');
              setTo(e.target.value);
            }}
          />
        </div>

        {isLoading && <InvoiceTableSkeleton />}
        {isError && (
          <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
            Failed to load ventures
          </div>
        )}

        {data && (
          <>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light px-6 py-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-cdy-muted">Active Ventures: </span>
                  <span className="font-medium text-cdy-white">{data.ventures.length}</span>
                </div>
                <div>
                  <span className="text-cdy-muted">Total Income: </span>
                  <span className="font-medium text-cdy-white">
                    {formatCurrency(data.totals.totalIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-cdy-muted">Total Expenses: </span>
                  <span className="font-medium text-cdy-white">
                    {formatCurrency(data.totals.totalExpenses)}
                  </span>
                </div>
                <div>
                  <span className="text-cdy-muted">Net: </span>
                  <span
                    className={`font-medium ${
                      data.totals.totalNetProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(data.totals.totalNetProfit)}
                  </span>
                </div>
              </div>
            </div>

            {data.ventures.length === 0 ? (
              <p className="text-cdy-muted">No active ventures yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {data.ventures.map((summary) => (
                  <VentureCard
                    key={summary.venture.id}
                    summary={summary}
                    maxIncome={maxIncome}
                    maxExpense={maxExpense}
                    onLogIncome={setIncomeVentureId}
                    onLogExpense={(id, name) => setExpenseTarget({ id, name })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <AddVentureDrawer open={addOpen} onClose={() => setAddOpen(false)} />
        {incomeVentureId && (
          <LogIncomeDrawer
            open
            ventureId={incomeVentureId}
            onClose={() => setIncomeVentureId(null)}
          />
        )}
        {expenseTarget && (
          <LogExpenseDrawer
            open
            ventureId={expenseTarget.id}
            ventureName={expenseTarget.name}
            onClose={() => setExpenseTarget(null)}
          />
        )}
      </div>
    </FeatureReadGate>
  );
}
