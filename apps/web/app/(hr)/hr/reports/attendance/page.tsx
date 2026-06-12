'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useHrAttendanceSummaryReport } from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AttendanceSummaryReportPage(): JSX.Element {
  const now = new Date();
  const defaultFrom = format(startOfMonth(now), 'yyyy-MM-dd');
  const defaultTo = format(endOfMonth(now), 'yyyy-MM-dd');

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [applied, setApplied] = useState({ from: defaultFrom, to: defaultTo });

  const filters = useMemo(
    () => ({ from: applied.from, to: applied.to }),
    [applied],
  );
  const { data: report, isLoading, isError } =
    useHrAttendanceSummaryReport(filters);

  function applyFilters(): void {
    setApplied({ from, to });
  }

  function setThisMonth(): void {
    setFrom(defaultFrom);
    setTo(defaultTo);
    setApplied({ from: defaultFrom, to: defaultTo });
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
        <span className="text-cdy-white">Attendance Summary</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">
        Attendance Summary
      </h1>

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
        <Button variant="outline" onClick={setThisMonth}>
          This month
        </Button>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading report…</p>}
      {isError && <p className="text-cdy-muted">Failed to load report.</p>}

      {report && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
          <h2 className="mb-4 text-lg font-semibold text-cdy-white">
            {format(new Date(applied.from), 'MMM d, yyyy')} –{' '}
            {format(new Date(applied.to), 'MMM d, yyyy')}
          </h2>
          {report.summary.length === 0 ? (
            <p className="text-sm text-cdy-muted">
              No attendance data for this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                    <th className="pb-2 pr-4 font-medium">Employee</th>
                    <th className="pb-2 pr-4 font-medium text-emerald-400">
                      Present
                    </th>
                    <th className="pb-2 pr-4 font-medium text-cdy-red">
                      Absent
                    </th>
                    <th className="pb-2 pr-4 font-medium text-amber-400">
                      Half Day
                    </th>
                    <th className="pb-2 pr-4 font-medium text-blue-400">
                      On Leave
                    </th>
                    <th className="pb-2 font-medium">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {report.summary.map((row) => (
                    <tr
                      key={row.employeeId}
                      className="border-b border-cdy-navy-border/50"
                    >
                      <td className="py-2 pr-4 text-cdy-white">
                        {row.employeeName}
                      </td>
                      <td className="py-2 pr-4 text-emerald-400">
                        {row.present}
                      </td>
                      <td className="py-2 pr-4 text-cdy-red">{row.absent}</td>
                      <td className="py-2 pr-4 text-amber-400">
                        {row.halfDay}
                      </td>
                      <td className="py-2 pr-4 text-blue-400">
                        {row.onLeave}
                      </td>
                      <td className="py-2 text-cdy-white">
                        {row.totalHours.toFixed(1)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
