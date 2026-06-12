'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients, exportClientsCsv } from '@/hooks/useCrm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Download } from 'lucide-react';

export default function ClientsListPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data: clients, isLoading } = useClients(search || undefined);

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      await exportClientsCsv(search || undefined);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Clients</h1>
        <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <Input
        placeholder="Search by company, contact, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {isLoading && <p className="text-cdy-muted">Loading clients...</p>}
      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Invoiced</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Client since</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
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
                <td className="px-4 py-3 text-cdy-white">
                  {formatCurrency(client.financeSummary?.totalInvoiced ?? 0)}
                </td>
                <td className="px-4 py-3 text-cdy-muted">
                  {formatCurrency(client.financeSummary?.outstanding ?? 0)}
                </td>
                <td className="px-4 py-3 text-cdy-muted">{client.country}</td>
                <td className="px-4 py-3 text-cdy-muted">
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/clients/${client.id}`}
                    className="text-cdy-red hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
