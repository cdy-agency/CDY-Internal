'use client';

import Link from 'next/link';
import { useHrHeadcountReport } from '@/hooks/useHr';

export default function HeadcountReportPage(): JSX.Element {
  const { data: report, isLoading, isError } = useHrHeadcountReport();

  const departments = Object.entries(report?.byDepartment ?? {}).sort(
    ([, a], [, b]) => b - a,
  );
  const maxCount = Math.max(...departments.map(([, c]) => c), 1);

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
        <span className="text-cdy-white">Headcount</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">Headcount Report</h1>

      {isLoading && <p className="text-cdy-muted">Loading report…</p>}
      {isError && <p className="text-cdy-muted">Failed to load report.</p>}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Total Employees</p>
              <p className="mt-1 text-3xl font-semibold text-cdy-white">
                {report.total}
              </p>
            </div>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <p className="text-sm text-cdy-muted">Active</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-400">
                {report.active}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
            <h2 className="mb-4 text-lg font-semibold text-cdy-white">
              By Department
            </h2>
            {departments.length === 0 ? (
              <p className="text-sm text-cdy-muted">No department data.</p>
            ) : (
              <div className="space-y-3">
                {departments.map(([dept, count]) => (
                  <div key={dept}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-cdy-white">{dept || 'Unassigned'}</span>
                      <span className="text-cdy-muted">{count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-cdy-navy">
                      <div
                        className="h-full rounded-full bg-cdy-red transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <h2 className="mb-4 text-lg font-semibold text-cdy-white">
                By Status
              </h2>
              <dl className="space-y-2 text-sm">
                {Object.entries(report.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <dt className="text-cdy-muted">{status}</dt>
                    <dd className="text-cdy-white">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-5">
              <h2 className="mb-4 text-lg font-semibold text-cdy-white">
                By Employment Type
              </h2>
              <dl className="space-y-2 text-sm">
                {Object.entries(report.byEmploymentType).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <dt className="text-cdy-muted">{type}</dt>
                    <dd className="text-cdy-white">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
