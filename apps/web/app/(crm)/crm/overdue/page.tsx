'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useOverdueLeads } from '@/hooks/useCrm';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function OverdueLeadsPage(): JSX.Element {
  const { data: leads, isLoading } = useOverdueLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cdy-white">Overdue leads</h1>
        <p className="text-sm text-cdy-muted">
          Open leads with a follow-up date that has passed
        </p>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading overdue leads...</p>}

      {!isLoading && (leads?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-cdy-muted" />
          <p className="text-cdy-white">No overdue follow-ups</p>
          <p className="mt-1 text-sm text-cdy-muted">
            All open leads are up to date.
          </p>
        </div>
      )}

      {(leads?.length ?? 0) > 0 && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Next action</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Days overdue</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((lead) => (
                <tr
                  key={lead.leadId}
                  className="border-b border-cdy-navy-border/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/leads/${lead.leadId}`}
                      className="font-medium text-cdy-white hover:text-cdy-red"
                    >
                      {lead.companyName}
                    </Link>
                    <span className="mt-0.5 block text-xs text-cdy-muted">
                      {lead.contactName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {lead.stage.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {lead.assignedToName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-white">{lead.nextAction}</td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {format(new Date(lead.nextActionDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {lead.daysOverdue} day{lead.daysOverdue !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {lead.estimatedValue != null
                      ? formatCurrency(lead.estimatedValue, lead.currency)
                      : '—'}
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
