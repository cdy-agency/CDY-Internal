'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { InvoiceStatus, type ClientSource } from '@cdy/shared';
import { useClient } from '@/hooks/useCrm';
import { formatCurrency } from '@/lib/utils';
import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';

const SOURCE_CONFIG: Record<ClientSource, { label: string; color: string; bg: string; border: string }> = {
  PIPELINE:  { label: 'From pipeline',    color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-800' },
  DIRECT:    { label: 'Direct client',    color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-800' },
  REFERRAL:  { label: 'Referral',         color: 'text-amber-400',  bg: 'bg-amber-900/20',  border: 'border-amber-800' },
  RETURNING: { label: 'Returning client', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-800' },
};

const SERVICE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SOFTWARE_DEV:         { label: '💻 Software / Website',   color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-800' },
  BRANDING:             { label: '🎨 Branding',             color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-800' },
  SOCIAL_MEDIA:         { label: '📱 Social Media',         color: 'text-pink-400',   bg: 'bg-pink-900/20',   border: 'border-pink-800' },
  INFLUENCER_MARKETING: { label: '⭐ Influencer Marketing', color: 'text-amber-400',  bg: 'bg-amber-900/20',  border: 'border-amber-800' },
  SALES_SERVICES:       { label: '🤝 Sales Services',       color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-800' },
  GENERAL:              { label: '📋 General',              color: 'text-gray-400',   bg: 'bg-gray-900/20',   border: 'border-gray-700' },
};

type ClientTab = 'overview' | 'leads' | 'activities' | 'invoices';

export default function ClientDetailPage(): JSX.Element {
  const params = useParams();
  const id = params.id as string;
  const { data: client, isLoading } = useClient(id);
  const [tab, setTab] = useState<ClientTab>('overview');

  if (isLoading || !client) {
    return <p className="text-cdy-muted">Loading client...</p>;
  }

  const tabs: Array<{ id: ClientTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'leads', label: 'Lead history' },
    { id: 'activities', label: 'Activity history' },
    { id: 'invoices', label: 'Invoices' },
  ];

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm/clients" className="hover:text-cdy-white">Clients</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">{client.companyName}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-cdy-white">{client.companyName}</h1>
        {(() => {
          const src = SOURCE_CONFIG[client.source as ClientSource] ?? SOURCE_CONFIG.DIRECT;
          return (
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${src.color} ${src.bg} ${src.border}`}>
              {src.label}
            </span>
          );
        })()}
        {client.primaryService && (() => {
          const svc = SERVICE_CONFIG[client.primaryService] ?? SERVICE_CONFIG.GENERAL;
          return (
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${svc.color} ${svc.bg} ${svc.border}`}>
              {svc.label}
            </span>
          );
        })()}
        {client.primaryService && client.serviceValue && (
          <span className="text-xs text-cdy-muted">
            {client.serviceCurrency ?? 'RWF'} {Number(client.serviceValue).toLocaleString()}
          </span>
        )}
      </div>
      {client.source === 'PIPELINE' && client.leadId && (
        <Link href={`/crm/leads/${client.leadId}`} className="text-xs text-cdy-red hover:underline">
          View original lead →
        </Link>
      )}
      {client.source !== 'PIPELINE' && (
        <p className="text-xs text-cdy-muted">
          Registered directly on {format(new Date(client.createdAt), 'MMM d, yyyy')}
        </p>
      )}
      {/* Links to auto-created service records */}
      <div className="flex flex-wrap gap-3">
        {client.softwareProjectId && (
          <Link href={`/software/${client.softwareProjectId}`} className="text-xs text-cdy-red hover:underline">
            View software project →
          </Link>
        )}
        {client.brandingProjectId && (
          <Link href={`/branding/${client.brandingProjectId}`} className="text-xs text-cdy-red hover:underline">
            View branding project →
          </Link>
        )}
        {client.influencerCampaignId && (
          <Link href={`/influencer/${client.influencerCampaignId}`} className="text-xs text-cdy-red hover:underline">
            View influencer campaign →
          </Link>
        )}
        {client.salesCampaignId && (
          <Link href={`/sales/${client.salesCampaignId}`} className="text-xs text-cdy-red hover:underline">
            View sales campaign →
          </Link>
        )}
        {client.projectId && (
          <Link href={`/projects/${client.projectId}`} className="text-xs text-cdy-red hover:underline">
            View project →
          </Link>
        )}
      </div>

      <div className="flex gap-2 border-b border-cdy-navy-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-cdy-red text-cdy-red'
                : 'border-transparent text-cdy-muted hover:text-cdy-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="mb-4 font-medium text-cdy-white">Client info</h2>
            <div className="space-y-1 text-sm text-cdy-muted">
              <p>{client.contactName}</p>
              <p>{client.email}</p>
              <p>{client.phone ?? '—'}</p>
              <p>{client.country}</p>
              {client.website && <p>{client.website}</p>}
            </div>
          </div>
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="mb-4 font-medium text-cdy-white">Finance summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Total invoiced</dt>
                <dd className="text-cdy-white">
                  {formatCurrency(client.financeSummary.totalInvoiced)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Paid</dt>
                <dd className="text-cdy-white">
                  {formatCurrency(client.financeSummary.paid ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Outstanding</dt>
                <dd className="text-cdy-white">
                  {formatCurrency(client.financeSummary.outstanding)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cdy-muted">Invoice count</dt>
                <dd className="text-cdy-white">{client.financeSummary.invoiceCount}</dd>
              </div>
            </dl>
            <Link
              href={`/finance/invoices?clientId=${client.id}`}
              className="mt-4 inline-block text-sm text-cdy-red hover:underline"
            >
              View all invoices →
            </Link>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <ul className="space-y-3 text-sm">
            {client.leads?.map((lead) => (
              <li
                key={lead.id}
                className="flex items-center justify-between border-b border-cdy-navy-border/50 pb-2"
              >
                <Link href={`/crm/leads/${lead.id}`} className="text-cdy-red hover:underline">
                  {lead.contactName}
                </Link>
                <span className="text-cdy-muted">{lead.stage.replace('_', ' ')}</span>
                <span className="text-cdy-white">
                  {lead.estimatedValue != null
                    ? formatCurrency(Number(lead.estimatedValue))
                    : '—'}
                </span>
              </li>
            ))}
            {(!client.leads || client.leads.length === 0) && (
              <p className="text-cdy-muted">No leads linked to this client.</p>
            )}
          </ul>
        </div>
      )}

      {tab === 'activities' && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <div className="space-y-4">
            {client.activities?.map((activity) => (
              <div key={activity.id} className="border-l-2 border-cdy-navy-border pl-4">
                <p className="text-xs text-cdy-muted">
                  {format(new Date(activity.performedAt), 'MMM d, yyyy h:mm a')}
                </p>
                <p className="font-medium text-cdy-white">
                  {activity.type} — {activity.summary}
                </p>
                <p className="text-sm text-cdy-muted">
                  {activity.leadCompanyName} · {activity.performedByName}
                </p>
                {activity.outcome && (
                  <p className="text-sm text-cdy-muted">Outcome: {activity.outcome}</p>
                )}
              </div>
            ))}
            {(!client.activities || client.activities.length === 0) && (
              <p className="text-cdy-muted">No activities recorded.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-2 py-2">Invoice #</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Due date</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {client.invoices?.map((inv) => (
                <tr key={inv.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-2 py-2 font-mono text-cdy-white">{inv.invoiceNumber}</td>
                  <td className="px-2 py-2 text-cdy-white">
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td className="px-2 py-2">
                    <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                  </td>
                  <td className="px-2 py-2 text-cdy-muted">
                    {format(new Date(inv.dueDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/finance/invoices/${inv.id}`}
                      className="text-cdy-red hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link
            href={`/finance/invoices?clientId=${client.id}`}
            className="mt-4 inline-block text-sm text-cdy-red hover:underline"
          >
            View all invoices →
          </Link>
        </div>
      )}
    </div>
  );
}
