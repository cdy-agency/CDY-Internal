'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useClients, useDeleteClient, useSalesAgents, exportClientsCsv } from '@/hooks/useCrm';
import { useVentureLookup } from '@/hooks/useVentures';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/components/PermissionGate';
import { AddClientDrawer } from '@/components/crm/clients/AddClientDrawer';
import { EditClientDrawer } from '@/components/crm/clients/EditClientDrawer';
import { ventureColorHex } from '@/lib/ventureUtils';
import type { ClientRecord, ClientSource } from '@cdy/shared';

const SOURCE_CONFIG: Record<ClientSource, { label: string; className: string }> = {
  PIPELINE: { label: 'Pipeline', className: 'text-blue-400' },
  DIRECT: { label: 'Direct', className: 'text-green-400' },
  REFERRAL: { label: 'Referral', className: 'text-amber-400' },
  RETURNING: { label: 'Returning', className: 'text-purple-400' },
};

const SOURCE_FILTERS: Array<{ value: ClientSource | ''; label: string }> = [
  { value: '', label: 'All clients' },
  { value: 'PIPELINE', label: 'From pipeline' },
  { value: 'DIRECT', label: 'Direct' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'RETURNING', label: 'Returning' },
];

export default function ClientsListPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<ClientSource | ''>('');
  const [ventureFilter, setVentureFilter] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'companyName'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [clientType, setClientType] = useState<'COMPANY' | 'INDIVIDUAL' | ''>('');
  const [clientKind, setClientKind] = useState<'venture' | 'service' | ''>('');
  const [exporting, setExporting] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { data: clients, isLoading } = useClients({
    search: search || undefined,
    source: sourceFilter || undefined,
    ventureId: ventureFilter || undefined,
    assignedTo: assignedTo || undefined,
    createdBy: createdBy || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy,
    sortOrder,
    clientType: clientType || undefined,
    clientKind: clientKind || undefined,
  });
  const { data: agents } = useSalesAgents();
  const { data: ventures = [] } = useVentureLookup();
  const deleteClient = useDeleteClient();

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      await exportClientsCsv(search || undefined);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteClient(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await deleteClient.mutateAsync(deleteTarget.id);
      toast.success('Client deleted');
      setDeleteTarget(null);
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Clients</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <PermissionGate feature="crm.clients" action="write">
            <Button onClick={() => setAddClientOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs text-cdy-muted">Search</label>
          <Input
            placeholder="Company, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-cdy-muted">Created from</label>
          <Input
            type="date"
            className="mt-1"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-cdy-muted">Created to</label>
          <Input
            type="date"
            className="mt-1"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-cdy-muted">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'createdAt' | 'updatedAt' | 'companyName')
            }
            className="mt-1 h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
          >
            <option value="createdAt">Date created</option>
            <option value="updatedAt">Last updated</option>
            <option value="companyName">Name</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-cdy-muted">Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="mt-1 h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <select
          value={clientKind}
          onChange={(e) =>
            setClientKind(e.target.value as 'venture' | 'service' | '')
          }
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">Kind — all</option>
          <option value="venture">Venture</option>
          <option value="service">Service (not venture)</option>
        </select>
        <select
          value={clientType}
          onChange={(e) =>
            setClientType(e.target.value as 'COMPANY' | 'INDIVIDUAL' | '')
          }
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">Type — all</option>
          <option value="COMPANY">Company</option>
          <option value="INDIVIDUAL">Person (not company)</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as ClientSource | '')}
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          {SOURCE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {ventures.length > 0 && (
          <select
            value={ventureFilter}
            onChange={(e) => setVentureFilter(e.target.value)}
            className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
          >
            <option value="">All ventures</option>
            <option value="none">No venture</option>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">Assigned to — all</option>
          {agents?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
        <select
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          <option value="">Created by — anyone</option>
          {agents?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-cdy-muted">Loading clients...</p>}

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Venture</th>
              <th className="px-4 py-3">Invoiced</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => {
              const src = SOURCE_CONFIG[client.source] ?? SOURCE_CONFIG.DIRECT;
              return (
                <tr key={client.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/clients/${client.id}`}
                      className="font-medium text-cdy-white hover:text-cdy-red"
                    >
                      {client.companyName}
                    </Link>
                    <span className="ml-2 text-xs text-cdy-muted">{client.country}</span>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {client.contactName}
                    <span className="block text-xs">{client.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${src.className}`}>{src.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {client.venture ? (
                      <Link
                        href={`/finance/ventures/${client.venture.id}`}
                        className="flex items-center gap-1.5 text-xs text-cdy-white hover:text-cdy-red"
                      >
                        <span
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: ventureColorHex(client.venture.color) }}
                        />
                        {client.venture.name}
                      </Link>
                    ) : (
                      <span className="text-xs text-cdy-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-cdy-white">
                    {formatCurrency(client.financeSummary?.totalInvoiced ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {formatCurrency(client.financeSummary?.outstanding ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {client.assignedToName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {client.createdByName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {format(new Date(client.createdAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        className="text-cdy-red hover:underline"
                      >
                        View
                      </Link>
                      <PermissionGate feature="crm.clients" action="write">
                        <button
                          type="button"
                          onClick={() => setEditClient(client)}
                          className="text-cdy-muted hover:text-cdy-white"
                          aria-label="Edit client"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: client.id,
                              name: client.companyName ?? client.contactName,
                            })
                          }
                          className="text-cdy-muted hover:text-cdy-red"
                          aria-label="Delete client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !clients?.length && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-cdy-muted">
                  No clients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddClientDrawer
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
      />

      <EditClientDrawer
        open={Boolean(editClient)}
        client={editClient}
        onClose={() => setEditClient(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete client?"
        description="This action can be undone by an admin, but the record will be hidden immediately."
        isLoading={deleteClient.isPending}
        onConfirm={() => void handleDeleteClient()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
