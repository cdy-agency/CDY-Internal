'use client';

import { Fragment } from 'react';
import { formatCurrency, cn } from '@/lib/utils';

export interface ReportRow {
  label: string;
  current: number;
  previous: number;
  isTotal?: boolean;
  isHighlight?: boolean;
  isPercent?: boolean;
}

export interface ReportSection {
  title: string;
  rows: ReportRow[];
}

interface ReportTableProps {
  sections: ReportSection[];
  showComparison?: boolean;
}

function changePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function ChangeCell({ current, previous }: { current: number; previous: number }) {
  const delta = changePercent(current, previous);
  if (delta === 0) {
    return <span className="text-cdy-muted">0%</span>;
  }
  const positive = delta > 0;
  return (
    <span className={positive ? 'text-[var(--cdy-success)]' : 'text-[var(--cdy-danger)]'}>
      {positive ? '↑ ' : '↓ '}
      {Math.abs(delta)}%
    </span>
  );
}

export function ReportTable({
  sections,
  showComparison = true,
}: ReportTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-cdy-navy-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cdy-navy-border bg-cdy-navy-light text-left text-cdy-muted">
            <th className="px-4 py-3 font-medium"> </th>
            <th className="px-4 py-3 font-medium text-right">Current</th>
            {showComparison && (
              <>
                <th className="px-4 py-3 font-medium text-right">Previous</th>
                <th className="px-4 py-3 font-medium text-right">Change</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.title}>
              <tr>
                <td
                  colSpan={showComparison ? 4 : 2}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cdy-muted"
                >
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr
                  key={`${section.title}-${row.label}`}
                  className={cn(
                    'border-b border-cdy-navy-border/50 hover:bg-cdy-navy-light/50',
                    row.isTotal && 'bg-cdy-navy font-medium',
                    row.isHighlight &&
                      'border-l-2 border-l-cdy-red bg-cdy-navy-border/30',
                    row.isHighlight &&
                      row.current < 0 &&
                      'bg-cdy-red-light',
                  )}
                >
                  <td
                    className={cn(
                      'px-4 py-2.5 pl-8 text-cdy-white',
                      row.isTotal && 'pl-4 font-medium',
                      row.isHighlight && 'pl-4 font-semibold',
                    )}
                  >
                    {row.label}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right text-cdy-white',
                      row.isTotal && row.label.includes('REVENUE') && 'text-[var(--cdy-success)]',
                      row.isHighlight &&
                        (row.current >= 0
                          ? 'text-[var(--cdy-success)]'
                          : 'text-[var(--cdy-danger)]'),
                    )}
                  >
                    {row.isPercent
                      ? `${row.current.toFixed(1)}%`
                      : formatCurrency(row.current)}
                  </td>
                  {showComparison && (
                    <>
                      <td className="px-4 py-2.5 text-right text-cdy-muted">
                        {row.isPercent
                          ? `${row.previous.toFixed(1)}%`
                          : formatCurrency(row.previous)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!row.isPercent && (
                          <ChangeCell current={row.current} previous={row.previous} />
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
