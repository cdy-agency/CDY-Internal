'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse, TaxRateRecord } from '@cdy/shared';
import type { AxiosError } from 'axios';

const COUNTRIES = [
  { value: 'RW', label: 'Rwanda (RW)' },
  { value: 'GH', label: 'Ghana (GH)' },
  { value: 'KE', label: 'Kenya (KE)' },
  { value: 'NG', label: 'Nigeria (NG)' },
  { value: 'ALL', label: 'All countries' },
];

const SERVICE_TYPES = [
  { value: '', label: 'All services' },
  { value: 'general', label: 'General' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software Dev' },
  { value: 'retainer', label: 'Retainer' },
];

interface AddTaxRateModalProps {
  open: boolean;
  onClose: () => void;
}

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function AddTaxRateModal({
  open,
  onClose,
}: AddTaxRateModalProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('RW');
  const [serviceType, setServiceType] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayString());

  useEffect(() => {
    if (open) {
      setName('');
      setCountry('RW');
      setServiceType('');
      setRatePercent('');
      setEffectiveFrom(todayString());
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post<ApiResponse<TaxRateRecord>>('/tax/rates', {
        name,
        country,
        serviceType: serviceType || undefined,
        ratePercent: parseFloat(ratePercent),
        effectiveFrom,
      });
      toast.success('Tax rate added');
      await queryClient.invalidateQueries({ queryKey: ['tax', 'rates'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to add tax rate');
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
            <h2 className="text-lg font-semibold text-cdy-white">Add Tax Rate</h2>
            <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxName">Name</Label>
              <Input id="taxName" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxCountry">Country</Label>
              <select
                id="taxCountry"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxService">Service type</Label>
              <select
                id="taxService"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxEffective">Effective from</Label>
              <Input
                id="taxEffective"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-cdy-red hover:bg-cdy-red/90" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Tax Rate'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
