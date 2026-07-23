'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSalesAgents, useUpdateClient } from '@/hooks/useCrm';
import { useVentureLookup } from '@/hooks/useVentures';
import type { ClientRecord } from '@cdy/shared';

interface EditClientDrawerProps {
  open: boolean;
  client: ClientRecord | null;
  onClose: () => void;
}

export function EditClientDrawer({
  open,
  client,
  onClose,
}: EditClientDrawerProps): JSX.Element | null {
  const updateClient = useUpdateClient();
  const { data: agents = [] } = useSalesAgents();
  const { data: ventures = [] } = useVentureLookup();

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    website: '',
    industry: '',
    assignedTo: '',
    notes: '',
    ventureId: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && client) {
      setForm({
        companyName: client.companyName ?? '',
        contactName: client.contactName ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        country: client.country ?? '',
        city: client.city ?? '',
        website: client.website ?? '',
        industry: client.industry ?? '',
        assignedTo: client.assignedTo ?? '',
        notes: client.notes ?? '',
        ventureId: client.ventureId ?? '',
      });
      setError('');
    }
  }, [open, client]);

  if (!open || !client) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    setError('');
    try {
      await updateClient.mutateAsync({
        id: client!.id,
        data: {
          companyName: form.companyName || undefined,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          country: form.country || undefined,
          city: form.city || undefined,
          website: form.website || undefined,
          industry: form.industry || undefined,
          assignedTo: form.assignedTo || undefined,
          notes: form.notes || undefined,
          ventureId: form.ventureId || null,
        },
      });
      toast.success('Client updated');
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message
          : 'Failed to update client';
      setError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col bg-cdy-navy shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-5 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Edit Client</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <Label className="text-cdy-muted">Company name</Label>
            <Input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="e.g. Kigali Media Ltd"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-cdy-muted">Contact person *</Label>
            <Input
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">City</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {ventures.length > 0 && (
            <div>
              <Label className="text-cdy-muted">Venture tag</Label>
              <select
                value={form.ventureId}
                onChange={(e) => set('ventureId', e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">No venture</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label className="text-cdy-muted">Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-cdy-muted">Website</Label>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-cdy-muted">Account manager</Label>
            <select
              value={form.assignedTo}
              onChange={(e) => set('assignedTo', e.target.value)}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-cdy-muted">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-cdy-navy-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={updateClient.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={updateClient.isPending}>
            {updateClient.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
