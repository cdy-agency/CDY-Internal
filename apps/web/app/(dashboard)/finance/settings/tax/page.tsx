'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useTaxRates } from '@/hooks/useTax';
import { AddTaxRateModal } from '@/components/finance/tax/AddTaxRateModal';
import { Button } from '@/components/ui/button';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { PermissionGate } from '@/components/PermissionGate';

export default function TaxRatesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: rates, isLoading } = useTaxRates();
  const [modalOpen, setModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const activeRates = rates?.filter((r) => r.isActive) ?? [];
  const inactiveRates = rates?.filter((r) => !r.isActive) ?? [];

  async function deactivate(id: string): Promise<void> {
    try {
      await api.delete(`/tax/rates/${id}`);
      toast.success('Tax rate deactivated');
      await queryClient.invalidateQueries({ queryKey: ['tax', 'rates'] });
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/settings/tax" className="hover:text-cdy-white">Settings</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Tax Rates</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cdy-white">Tax Rates</h1>
        <PermissionGate feature="finance.tax" action="write">
          <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setModalOpen(true)}>
            Add Tax Rate
          </Button>
        </PermissionGate>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {rates && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Service Type</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
                <th className="px-4 py-3 font-medium">Effective From</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeRates.map((rate) => (
                <tr key={rate.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">{rate.name}</td>
                  <td className="px-4 py-3 text-cdy-muted">{rate.country}</td>
                  <td className="px-4 py-3 text-cdy-muted">{rate.serviceType ?? 'All'}</td>
                  <td className="px-4 py-3 text-right text-cdy-white">{rate.ratePercent}%</td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {format(new Date(rate.effectiveFrom), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <PermissionGate feature="finance.tax" action="write">
                      <Button variant="outline" size="sm" onClick={() => deactivate(rate.id)}>
                        Deactivate
                      </Button>
                    </PermissionGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inactiveRates.length > 0 && (
        <div>
          <button
            type="button"
            className="mb-3 text-sm text-cdy-muted hover:text-cdy-white"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? 'Hide' : 'Show'} deactivated rates ({inactiveRates.length})
          </button>
          {showInactive && (
            <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light opacity-60">
              <table className="w-full text-sm">
                <tbody>
                  {inactiveRates.map((rate) => (
                    <tr key={rate.id} className="border-b border-cdy-navy-border/50">
                      <td className="px-4 py-3 text-cdy-muted">{rate.name}</td>
                      <td className="px-4 py-3 text-cdy-muted">{rate.country}</td>
                      <td className="px-4 py-3 text-cdy-muted">{rate.ratePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AddTaxRateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
