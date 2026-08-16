'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useCompanyAccounts } from '@/hooks/useCompanyAccounts';
import { AddCompanyAccountModal } from '@/components/finance/accounts/AddCompanyAccountModal';
import { Button } from '@/components/ui/button';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { PermissionGate } from '@/components/PermissionGate';
import { CompanyAccountType } from '@cdy/shared';

const TYPE_LABELS: Record<CompanyAccountType, string> = {
  [CompanyAccountType.BANK]: 'Bank',
  [CompanyAccountType.MOBILE_MONEY]: 'Mobile Money',
  [CompanyAccountType.OTHER]: 'Other',
};

export default function CompanyAccountsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useCompanyAccounts();
  const [modalOpen, setModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];
  const inactiveAccounts = accounts?.filter((a) => !a.isActive) ?? [];

  async function deactivate(id: string): Promise<void> {
    try {
      await api.delete(`/company-accounts/${id}`);
      toast.success('Account deactivated');
      await queryClient.invalidateQueries({ queryKey: ['company-accounts'] });
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/settings" className="hover:text-cdy-white">Settings</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Company Accounts</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cdy-white">Company Accounts</h1>
          <p className="text-sm text-cdy-muted">
            Bank and mobile money accounts that receive client payments — pick one when
            recording a payment so Finance knows which account the money actually landed in.
          </p>
        </div>
        <PermissionGate feature="finance.accounts" action="write">
          <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setModalOpen(true)}>
            Add Account
          </Button>
        </PermissionGate>
      </div>

      {isLoading && <InvoiceTableSkeleton />}

      {accounts && (
        <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Account / MoMo #</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeAccounts.map((account) => (
                <tr key={account.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3 text-cdy-white">{account.name}</td>
                  <td className="px-4 py-3 text-cdy-muted">{TYPE_LABELS[account.type]}</td>
                  <td className="px-4 py-3 text-cdy-muted">{account.provider ?? '—'}</td>
                  <td className="px-4 py-3 text-cdy-muted">{account.accountNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-cdy-muted">{account.currency ?? '—'}</td>
                  <td className="px-4 py-3">
                    <PermissionGate feature="finance.accounts" action="write">
                      <Button variant="outline" size="sm" onClick={() => deactivate(account.id)}>
                        Deactivate
                      </Button>
                    </PermissionGate>
                  </td>
                </tr>
              ))}
              {activeAccounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-cdy-muted">
                    No active accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {inactiveAccounts.length > 0 && (
        <div>
          <button
            type="button"
            className="mb-3 text-sm text-cdy-muted hover:text-cdy-white"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? 'Hide' : 'Show'} deactivated accounts ({inactiveAccounts.length})
          </button>
          {showInactive && (
            <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light opacity-60">
              <table className="w-full text-sm">
                <tbody>
                  {inactiveAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-cdy-navy-border/50">
                      <td className="px-4 py-3 text-cdy-muted">{account.name}</td>
                      <td className="px-4 py-3 text-cdy-muted">{TYPE_LABELS[account.type]}</td>
                      <td className="px-4 py-3 text-cdy-muted">{account.provider ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AddCompanyAccountModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
