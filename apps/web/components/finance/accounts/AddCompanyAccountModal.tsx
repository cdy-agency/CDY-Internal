'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse, CompanyAccountRecord } from '@cdy/shared';
import { CompanyAccountType } from '@cdy/shared';
import type { AxiosError } from 'axios';

const ACCOUNT_TYPES: { value: CompanyAccountType; label: string }[] = [
  { value: CompanyAccountType.BANK, label: '🏦 Bank Account' },
  { value: CompanyAccountType.MOBILE_MONEY, label: '📱 Mobile Money' },
  { value: CompanyAccountType.OTHER, label: '⋯ Other' },
];

interface AddCompanyAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddCompanyAccountModal({
  open,
  onClose,
}: AddCompanyAccountModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CompanyAccountType>(CompanyAccountType.BANK);
  const [provider, setProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setType(CompanyAccountType.BANK);
      setProvider('');
      setAccountNumber('');
      setCurrency('');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<CompanyAccountRecord>>('/company-accounts', {
        name,
        type,
        provider: provider || undefined,
        accountNumber: accountNumber || undefined,
        currency: currency || undefined,
      });
      toast.success('Account added');
      await queryClient.invalidateQueries({ queryKey: ['company-accounts'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to add account');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">Add Company Account</h2>
            <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Name</Label>
              <Input
                id="accountName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bank of Kigali - USD"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`rounded-lg border p-2.5 text-center text-sm transition-colors ${
                      type === opt.value
                        ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                        : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountProvider">Provider (optional)</Label>
              <Input
                id="accountProvider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Bank of Kigali, MTN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account / MoMo number (optional)</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="00234455 or 0788xxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountCurrency">Currency (optional)</Label>
              <Input
                id="accountCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="RWF"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-cdy-red hover:bg-cdy-red/90" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
