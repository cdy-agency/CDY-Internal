'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateClient, useSalesAgents } from '@/hooks/useCrm';
import { useVentures } from '@/hooks/useVentures';

const CLIENT_TYPE_OPTIONS = [
  { value: 'COMPANY',    label: '🏢 Company',    desc: 'Business, NGO, organisation' },
  { value: 'INDIVIDUAL', label: '👤 Individual', desc: 'Person without a company' },
] as const;

const SOURCE_OPTIONS = [
  { value: 'DIRECT',    label: '✋ Direct',    desc: 'Called or emailed directly' },
  { value: 'REFERRAL',  label: '👥 Referral',  desc: 'Referred by someone' },
  { value: 'RETURNING', label: '🔄 Returning', desc: 'Previous client' },
] as const;

const SERVICE_OPTIONS = [
  { value: 'SOFTWARE_DEV',         label: '💻 Software / Website',   desc: 'Web app, website, system' },
  { value: 'BRANDING',             label: '🎨 Branding',             desc: 'Brand identity, design' },
  { value: 'SOCIAL_MEDIA',         label: '📱 Social Media',         desc: 'Content, community mgmt' },
  { value: 'INFLUENCER_MARKETING', label: '⭐ Influencer Marketing', desc: 'Campaigns, creators' },
  { value: 'SALES_SERVICES',       label: '🤝 Sales Services',       desc: 'Field sales deployment' },
  { value: 'GENERAL',              label: '📋 General / Other',      desc: 'Consulting, mixed' },
] as const;

const SERVICE_RECORD_LABEL: Record<string, string> = {
  SOFTWARE_DEV:         'software project',
  BRANDING:             'branding project',
  INFLUENCER_MARKETING: 'influencer campaign',
  SALES_SERVICES:       'sales campaign',
  GENERAL:              'project',
};

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
  const { data: ventures = [] } = useVentures();

  const [form, setForm] = useState({
    clientType: 'COMPANY',
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
    primaryService: '',
    serviceValue: '',
    serviceCurrency: 'RWF',
    ventureId: '',
  });
  const [error, setError] = useState('');

  if (!open) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (form.clientType === 'COMPANY' && !form.companyName.trim()) {
      setError('Company name is required for company clients');
      return;
    }
    if (!form.contactName.trim()) {
      setError(form.clientType === 'INDIVIDUAL' ? 'Full name is required' : 'Contact name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!form.primaryService) {
      setError('Please select the primary service for this client');
      return;
    }
    setError('');
    try {
      const client = await createClient.mutateAsync({
        clientType: form.clientType,
        companyName: form.clientType === 'COMPANY' ? form.companyName : undefined,
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
        primaryService: form.primaryService,
        serviceValue: form.serviceValue ? Number(form.serviceValue) : undefined,
        serviceCurrency: form.serviceCurrency || 'RWF',
        ventureId: form.ventureId || undefined,
      });
      toast.success(
        `${form.clientType === 'INDIVIDUAL' ? form.contactName : (form.companyName || form.contactName)} added as a client`,
      );
      onSuccess?.(client.id);
      onClose();
      setForm({
        clientType: 'COMPANY',
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
        primaryService: '',
        serviceValue: '',
        serviceCurrency: 'RWF',
        ventureId: '',
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

  const isSocialMedia = form.primaryService === 'SOCIAL_MEDIA';
  const serviceRecordLabel = form.primaryService ? SERVICE_RECORD_LABEL[form.primaryService] : '';

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

          {/* Step 1 — Client type */}
          <div>
            <Label className="text-cdy-muted">Client type *</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CLIENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('clientType', opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.clientType === opt.value
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

          {/* Company name — only for COMPANY */}
          {form.clientType === 'COMPANY' && (
            <div>
              <Label className="text-cdy-muted">Company name *</Label>
              <Input
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="e.g. Kigali Media Ltd"
                className="mt-1"
              />
            </div>
          )}

          {/* Contact name — label changes for individual */}
          <div>
            <Label className="text-cdy-muted">
              {form.clientType === 'INDIVIDUAL' ? 'Full name *' : 'Contact person *'}
            </Label>
            <Input
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
              placeholder={
                form.clientType === 'INDIVIDUAL'
                  ? 'e.g. Jean Paul Mugisha'
                  : 'e.g. Sarah Ingabire'
              }
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
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="RW"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">City</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Kigali"
                className="mt-1"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <Label className="text-cdy-muted">How did they reach CDY?</Label>
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

          {/* Venture */}
          {ventures.length > 0 && (
            <div>
              <Label className="text-cdy-muted">Venture tag</Label>
              <select
                value={form.ventureId}
                onChange={(e) => set('ventureId', e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                <option value="">No venture (optional)</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {form.ventureId && (
                <p className="mt-1 text-xs text-blue-400">
                  Invoices for this client will automatically be tagged to this venture.
                </p>
              )}
            </div>
          )}

          {/* Service */}
          <div>
            <Label className="text-cdy-muted">Service *</Label>
            <p className="mt-0.5 text-xs text-cdy-muted">What service is this client paying for?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('primaryService', opt.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.primaryService === opt.value
                      ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                      : 'border-cdy-navy-border text-cdy-muted hover:border-cdy-navy-border/70'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-xs opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Service value */}
          {form.primaryService && (
            <div>
              <Label className="text-cdy-muted">
                Service value
                <span className="ml-1 font-normal text-cdy-dim">
                  {isSocialMedia ? '(monthly retainer amount)' : '(total agreed price)'}
                </span>
              </Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="number"
                  value={form.serviceValue}
                  onChange={(e) => set('serviceValue', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="flex-1"
                />
                <select
                  value={form.serviceCurrency}
                  onChange={(e) => set('serviceCurrency', e.target.value)}
                  className="w-24 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="RWF">RWF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {isSocialMedia ? (
                <p className="mt-1.5 text-xs text-amber-400">
                  ⚠️ A draft retainer will be created for Finance Manager to review and activate.
                  Billing starts only after activation.
                </p>
              ) : form.serviceValue ? (
                <p className="mt-1.5 text-xs text-green-400">
                  💡 A {serviceRecordLabel} and a draft invoice will be created automatically.
                </p>
              ) : null}
            </div>
          )}

          <div>
            <Label className="text-cdy-muted">Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="e.g. Technology"
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
