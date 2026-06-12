'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHrLeaveUtilisationReport } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function utilisationBarColor(rate: number): string {
  if (rate < 0.5) return 'bg-amber-500';
  if (rate <= 0.8) return 'bg-emerald-500';
  return 'bg-cdy-red';
}

function utilisationLabel(rate: number): string {
  if (rate < 0.5) return 'Under-utilised';
  if (rate <= 0.8) return 'Healthy';
  return 'Over-utilised';
}

export default function LeaveUtilisationReportPage(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: report, isLoading, isError } = useHrLeaveUtilisationReport(year);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/hr" className="hover:text-cdy-white">
          HR
        </Link>
        <span className="mx-2">/</span>
        <Link href="/hr/reports" className="hover:text-cdy-white">
          Reports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Leave Utilisation</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">
          Leave Utilisation — {year}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={year <= 2020}
            onClick={() => setYear((y) => y - 1)}
          >
            ← {year - 1}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={year >= currentYear}
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1} →
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-cdy-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          Under 50%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          50–80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-cdy-red" />
          Over 80%
        </span>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading report…</p>}
      {isError && <p className="text-cdy-muted">Failed to load report.</p>}

      {report && (
        <div className="space-y-4">
          {report.byType.length === 0 ? (
            <p className="text-sm text-cdy-muted">No leave data for {year}.</p>
          ) : (
            report.byType.map((item) => (
              <div
                key={item.leaveType}
                className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-cdy-white">
                      {item.leaveType}
                    </h2>
                    <p className="text-sm text-cdy-muted">
                      {item.employees} employees · {item.totalUsed} of{' '}
                      {item.totalEntitled} days used · avg{' '}
                      {item.avgUsedPerEmployee.toFixed(1)} days/employee
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      item.utilisationRate < 0.5
                        ? 'bg-amber-500/20 text-amber-400'
                        : item.utilisationRate <= 0.8
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-cdy-red/20 text-cdy-red',
                    )}
                  >
                    {(item.utilisationRate * 100).toFixed(0)}% —{' '}
                    {utilisationLabel(item.utilisationRate)}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-cdy-navy">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      utilisationBarColor(item.utilisationRate),
                    )}
                    style={{
                      width: `${Math.min(100, item.utilisationRate * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
