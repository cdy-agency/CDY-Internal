'use client';

import { format, parseISO } from 'date-fns';
import { useMyTimeEntries } from '@/hooks/useProjects';

export default function TimeLogPage(): JSX.Element {
  const { data: entries, isLoading } = useMyTimeEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cdy-white">Time Log</h1>
        <p className="text-sm text-cdy-muted">
          Your logged time entries across projects
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (entries?.length ?? 0) === 0 ? (
        <p className="text-sm text-cdy-muted">No time entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-cdy-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Hours</th>
                <th className="px-4 py-3 font-medium">Billable</th>
              </tr>
            </thead>
            <tbody>
              {entries?.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-cdy-navy-border/50 last:border-0"
                >
                  <td className="px-4 py-3 text-cdy-muted">
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-cdy-white">
                    {entry.project?.name ?? entry.projectId}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {entry.task?.title ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-white">
                    {entry.hours}h
                  </td>
                  <td className="px-4 py-3">
                    {entry.isBillable ? (
                      <span className="text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-cdy-muted">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
