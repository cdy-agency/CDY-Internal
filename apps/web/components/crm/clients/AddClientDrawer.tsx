'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateClient, useSalesAgents } from '@/hooks/useCrm';

const SOURCE_OPTIONS = [
  { value: 'DIRECT', label: '✋ Direct', desc: 'Called or emailed directly' },
  { value: 'REFERRAL', label: '👥 Referral', desc: 'Referred by someone' },
  { value: 'RETURNING', label: '🔄 Returning', desc: 'Previous client' },
] as const;

interface AddClientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string) => void;
  initialCompanyName?: string;
}

export function AddClientDrawer({
  open,
  onClose,
  onSuccess,
  initialCompanyName = '',
}: AddClientDrawerProps): JSX.Element | null {
  const createClient = useCreateClient();
  const { data: agents = [] } = useSalesAgents();

  const [form, setForm] = useState({
    companyName: initialCompanyName,
    contactName: '',
    email: '',
    phone: '',
    country: 'RW',
    city: '',
    website: '',
    industry: '',
    source: 'DIRECT',
    assignedTo: '',
    notes: '',
  });
  const [error, setError] = useState('');

  if (!open) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.email.trim()) {
      setError('Company name, contact name, and email are required');
      return;
    }
    setError('');
    try {
      const client = await createClient.mutateAsync({
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        country: form.country || 'RW',
        city: form.city || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        assignedTo: form.assignedTo || undefined,
        notes: form.notes || undefined,
        source: form.source,
      });
      toast.success(`${form.companyName} added as a client`);
      onSuccess?.(client.id);
      onClose();
      setForm({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        country: 'RW',
        city: '',
        website: '',
        industry: '',
        source: 'DIRECT',
        assignedTo: '',
        notes: '',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message
          : 'Failed to create client';
      setError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col bg-cdy-navy shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-5 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Add Client</h2>
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

          {/* Source selector */}
          <div>
            <Label className="text-cdy-muted">How did they reach CDY? *</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('source', opt.value)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    form.source === opt.value
                      ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                      : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-muted'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-cdy-muted">Company name *</Label>
            <Input
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              placeholder="e.g. Acme Corp Rwanda"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Contact name *</Label>
              <Input
                value={form.contactName}
                onChange={(e) => set('contactName', e.target.value)}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@company.com"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+250 7XX XXX XXX"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="RW"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">City</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Kigali"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="e.g. Technology"
                className="mt-1"
              />
            </div>
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
              <option value="">Select account manager (optional)</option>
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
              placeholder="How did they contact us? Any relevant context..."
              rows={3}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-cdy-navy-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={createClient.isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={createClient.isPending}>
            {createClient.isPending ? 'Adding…' : 'Add Client'}
          </Button>
        </div>
      </div>
    </div>
  );
}
