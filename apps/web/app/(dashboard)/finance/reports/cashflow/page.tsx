'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCashFlowReport,
  createCashFlowAdjustment,
  deleteCashFlowAdjustment,
} from '@/hooks/useReports';
import { formatCurrency } from '@/lib/utils';
import { downloadReportPdf } from '@/lib/reportPdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import type { CashFlowWeekBucket } from '@cdy/shared';
import { FeatureReadGate } from '@/components/FeatureReadGate';
import { PermissionGate } from '@/components/PermissionGate';

const WEEK_OPTIONS = [4, 8, 13, 26];

function CashFlowChart({
  weeks,
}: {
  weeks: CashFlowWeekBucket[];
}): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const balances = weeks.map((w) => w.runningBalance);
  const minBalance = Math.min(...balances, 0);
  const maxBalance = Math.max(...balances, 0);
  const range = maxBalance - minBalance || 1;

  const points = weeks.map((w, i) => {
    const x = padding.left + (i / Math.max(weeks.length - 1, 1)) * chartW;
    const y =
      padding.top +
      chartH -
      ((w.runningBalance - minBalance) / range) * chartH;
    return { x, y, week: w };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const zeroY =
    padding.top + chartH - ((0 - minBalance) / range) * chartH;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Cash flow forecast chart"
      >
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#475569"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <polyline
          fill="none"
          stroke="#C41E3A"
          strokeWidth={2.5}
          points={polyline}
        />
        {points.map((p, i) => (
          <circle
            key={p.week.weekStart}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={p.week.isNegative ? '#C41E3A' : '#ffffff'}
            stroke="#C41E3A"
            strokeWidth={2}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {points.map((p, i) => {
          const label = format(new Date(p.week.weekStart), 'MMM d');
          return (
            <text
              key={`label-${p.week.weekStart}`}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10}
            >
              {i % Math.ceil(weeks.length / 6) === 0 || i === weeks.length - 1
                ? label
                : ''}
            </text>
          );
        })}
      </svg>
      {hovered !== null && points[hovered] && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-xs shadow-lg">
          <p className="font-medium text-cdy-white">
            {points[hovered].week.weekLabel}
          </p>
          <p className="text-cdy-muted">
            Balance: {formatCurrency(points[hovered].week.runningBalance)}
          </p>
          <p className="text-cdy-muted">
            In: {formatCurrency(points[hovered].week.inflows)} / Out:{' '}
            {formatCurrency(points[hovered].week.outflows)}
          </p>
        </div>
      )}
    </div>
  );
}

function WeekRow({ week }: { week: CashFlowWeekBucket }): JSX.Element {
  const [open, setOpen] = useState(false);
  const negativeNet = week.netFlow < 0;
  const negativeBalance = week.isNegative;

  return (
    <>
      <tr
        className={
          negativeBalance
            ? 'border-l-2 border-l-cdy-red'
            : negativeNet
              ? 'border-l-2 border-l-amber-500'
              : ''
        }
      >
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-sm text-cdy-white"
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {week.weekLabel}
          </button>
        </td>
        <td className="px-4 py-3 text-right text-sm text-cdy-white">
          {formatCurrency(week.inflows)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-cdy-white">
          {formatCurrency(week.outflows)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-cdy-white">
          {week.netFlow >= 0 ? '+' : ''}
          {formatCurrency(week.netFlow)}
        </td>
        <td
          className={`px-4 py-3 text-right text-sm font-medium ${negativeBalance ? 'text-cdy-red' : 'text-cdy-white'}`}
        >
          {formatCurrency(week.runningBalance)}
        </td>
        <td className="px-4 py-3 text-center text-sm">
          {negativeBalance ? '🔴' : '✅'}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-cdy-navy px-8 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-cdy-muted">Inflows</p>
                {week.inflowItems.length === 0 ? (
                  <p className="text-xs text-cdy-muted">None</p>
                ) : (
                  week.inflowItems.map((item, idx) => (
                    <p key={`in-${idx}`} className="text-xs text-cdy-white">
                      {item.label}: {formatCurrency(item.amount)}
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-cdy-muted">Outflows</p>
                {week.outflowItems.length === 0 ? (
                  <p className="text-xs text-cdy-muted">None</p>
                ) : (
                  week.outflowItems.map((item, idx) => (
                    <p key={`out-${idx}`} className="text-xs text-cdy-white">
                      {item.label}: {formatCurrency(item.amount)}
                    </p>
                  ))
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CashFlowPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [weeks, setWeeks] = useState(13);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [showAddForm, setShowAddForm] = useState(false);
  const [adjLabel, setAdjLabel] = useState('');
  const [adjDirection, setAdjDirection] = useState<'IN' | 'OUT'>('OUT');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDate, setAdjDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfLoading, setPdfLoading] = useState(false);

  const filters = {
    weeks,
    openingBalance: Number(openingBalance) || 0,
  };

  const { data, isLoading, isError } = useCashFlowReport(filters);

  const adjustments = data?.adjustments ?? [];

  async function handleDeleteAdjustment(id: string): Promise<void> {
    try {
      await deleteCashFlowAdjustment(id);
      toast.success('Adjustment deleted');
      await queryClient.invalidateQueries({ queryKey: ['reports', 'cashflow'] });
    } catch {
      toast.error('Failed to delete adjustment');
    }
  }

  async function handleDownloadPdf(): Promise<void> {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        weeks: String(weeks),
        openingBalance: String(filters.openingBalance),
      });
      await downloadReportPdf(
        `/reports/cashflow/pdf?${params.toString()}`,
        `CDY-CashFlow-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        {},
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleAddAdjustment(): Promise<void> {
    if (!adjLabel || !adjAmount) {
      toast.error('Label and amount are required');
      return;
    }
    try {
      await createCashFlowAdjustment({
        label: adjLabel,
        amount: Number(adjAmount),
        direction: adjDirection,
        date: adjDate,
      });
      toast.success('Adjustment added');
      setShowAddForm(false);
      setAdjLabel('');
      setAdjAmount('');
      await queryClient.invalidateQueries({ queryKey: ['reports', 'cashflow'] });
    } catch {
      toast.error('Failed to add adjustment');
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;
  if (isError || !data) {
    return <p className="text-cdy-muted">Failed to load cash flow forecast.</p>;
  }

  return (
    <FeatureReadGate feature="finance.reports" featureName="Financial Reports">
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-cdy-muted">
            <Link href="/finance/reports" className="hover:text-cdy-white">
              Reports
            </Link>{' '}
            / Cash Flow Forecast
          </p>
          <h1 className="text-2xl font-semibold text-cdy-white">
            Cash Flow Forecast
          </h1>
        </div>
        <Button onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">Weeks</label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} weeks
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-cdy-muted">
            Opening balance
          </label>
          <Input
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {data.hasShortfall && (
        <div className="rounded-lg border border-cdy-red/40 bg-cdy-red-light p-4">
          <p className="font-medium text-cdy-red">
            Projected cash shortfall in weeks: {data.shortfallWeeks.join(', ')}
          </p>
          <p className="mt-1 text-sm text-cdy-white">
            Lowest projected balance:{' '}
            {formatCurrency(data.lowestProjectedBalance)}
          </p>
          <Button asChild variant="outline" className="mt-3" size="sm">
            <Link href="/finance/reports/ageing">Review Ageing Report</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Opening Balance', value: data.openingBalance },
          {
            label: 'Expected Inflows',
            value: data.totalExpectedInflows,
            sub: `(next ${weeks} weeks)`,
          },
          {
            label: 'Expected Outflows',
            value: data.totalExpectedOutflows,
            sub: `(next ${weeks} weeks)`,
          },
          {
            label: 'Lowest Balance',
            value: data.lowestProjectedBalance,
            sub: data.hasShortfall ? '(shortfall projected)' : '',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4"
          >
            <p className="text-xs text-cdy-muted">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-cdy-white">
              {formatCurrency(card.value)}
            </p>
            {card.sub && (
              <p className="mt-1 text-xs text-cdy-muted">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <CashFlowChart weeks={data.weeks} />
      </div>

      <div className="overflow-hidden rounded-lg border border-cdy-navy-border">
        <table className="w-full text-left">
          <thead className="bg-cdy-navy text-xs uppercase text-cdy-muted">
            <tr>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3 text-right">Inflows</th>
              <th className="px-4 py-3 text-right">Outflows</th>
              <th className="px-4 py-3 text-right">Net</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cdy-navy-border bg-cdy-navy-light">
            {data.weeks.map((week) => (
              <WeekRow key={week.weekStart} week={week} />
            ))}
          </tbody>
        </table>
      </div>

      <PermissionGate feature="finance.reports" action="write">
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-cdy-white">Manual Adjustments</h2>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              + Add Adjustment
            </Button>
          </div>
          {showAddForm && (
            <div className="mb-4 grid gap-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-4 md:grid-cols-5">
              <Input
                placeholder="Label"
                value={adjLabel}
                onChange={(e) => setAdjLabel(e.target.value)}
              />
              <select
                value={adjDirection}
                onChange={(e) =>
                  setAdjDirection(e.target.value as 'IN' | 'OUT')
                }
                className="rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-white"
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
              <Input
                type="number"
                placeholder="Amount"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
              />
              <Input
                type="date"
                value={adjDate}
                onChange={(e) => setAdjDate(e.target.value)}
              />
              <Button onClick={() => void handleAddAdjustment()}>Add</Button>
            </div>
          )}
          {adjustments.length === 0 ? (
            <p className="text-sm text-cdy-muted">No manual adjustments in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-cdy-muted">
                  <th className="pb-2">Label</th>
                  <th className="pb-2">Direction</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="border-t border-cdy-navy-border">
                    <td className="py-2 text-cdy-white">{adj.label}</td>
                    <td className="py-2 text-cdy-muted">{adj.direction}</td>
                    <td className="py-2 text-cdy-white">
                      {formatCurrency(adj.amount)}
                    </td>
                    <td className="py-2 text-cdy-muted">
                      {format(new Date(adj.date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteAdjustment(adj.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PermissionGate>
    </div>
    </FeatureReadGate>
  );
}
