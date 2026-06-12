'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfYear, subMonths } from 'date-fns';
import { useHrTurnoverReport } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TurnoverReportPage(): JSX.Element {
  const now = new Date();
  const [from, setFrom] = useState(format(startOfYear(now), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(now, 'yyyy-MM-dd'));
  const [applied, setApplied] = useState({ from, to });

  const filters = useMemo(
    () => ({ from: applied.from, to: applied.to }),
    [applied],
  );
  const { data: report, isLoading, isError } = useHrTurnoverReport(filters);

  function applyFilters(): void {
    setApplied({ from, to });
  }

  function setLastSixMonths(): void {
    const fromDate = format(subMonths(now, 6), 'yyyy-MM-dd');
    const toDate = format(now, 'yyyy-MM-dd');
    setFrom(fromDate);
    setTo(toDate);
    setApplied({ from: fromDate, to: toDate });
  }

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
        <span className="text-cdy-white">Turnover</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">Turnover Report</h1>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4">
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={applyFilters}>Apply</Button>
        <Button variant="outline" onClick={setLastSixMonths}>
          Last 6 months
        </Button>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading report…</p>}
      {isError && <p className="text-cdy-muted">Failed to load report.</p>}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">New Hires</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-400">
                {report.newHires}
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Terminations</p>
              <p className="mt-1 text-3xl font-semibold text-cdy-red">
                {report.terminations}
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Turnover Rate</p>
              <p className="mt-1 text-3xl font-semibold text-cdy-white">
                {(report.turnoverRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Avg Headcount</p>
              <p className="mt-1 text-3xl font-semibold text-cdy-white">
                {report.avgHeadcount}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
            <h2 className="mb-4 text-lg font-semibold text-cdy-white">
              Terminated Employees
            </h2>
            {report.terminated.length === 0 ? (
              <p className="text-sm text-cdy-muted">
                No terminations in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Department</th>
                      <th className="pb-2 pr-4 font-medium">End Date</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.terminated.map((row, i) => (
                      <tr
                        key={`${row.name}-${row.endDate ?? i}`}
                        className="border-b border-cdy-navy-border/50"
                      >
                        <td className="py-2 pr-4 text-cdy-white">{row.name}</td>
                        <td className="py-2 pr-4 text-cdy-muted">
                          {row.department ?? '—'}
                        </td>
                        <td className="py-2 pr-4 text-cdy-muted">
                          {row.endDate
                            ? format(new Date(row.endDate), 'MMM d, yyyy')
                            : '—'}
                        </td>
                        <td className="py-2 text-cdy-muted">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
