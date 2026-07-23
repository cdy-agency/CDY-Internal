'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeadSource } from '@cdy/shared';
import type { LeadRecord } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateLead, useSalesAgents } from '@/hooks/useCrm';
import { useVentureLookup } from '@/hooks/useVentures';

const SERVICE_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'software_dev', label: 'Software Dev' },
  { value: 'branding', label: 'Branding' },
  { value: 'influencer_marketing', label: 'Influencer Marketing' },
  { value: 'sales_services', label: 'Sales Services' },
  { value: 'general', label: 'General / Consulting' },
];

const SOURCE_OPTIONS = Object.values(LeadSource);

interface EditLeadDrawerProps {
  open: boolean;
  lead: LeadRecord | null;
  onClose: () => void;
}

export function EditLeadDrawer({ open, lead, onClose }: EditLeadDrawerProps): JSX.Element | null {
  const { data: agents } = useSalesAgents();
  const { data: ventures } = useVentureLookup();
  const activeVentures = (ventures ?? []).filter((v) => v.isActive);
  const updateLead = useUpdateLead();

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [leadType, setLeadType] = useState<'service' | 'venture'>('service');
  const [serviceInterest, setServiceInterest] = useState('marketing');
  const [ventureId, setVentureId] = useState('');
  const [source, setSource] = useState<LeadSource>(LeadSource.REFERRAL);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && lead) {
      setContactName(lead.contactName);
      setCompanyName(lead.companyName ?? '');
      setEmail(lead.email);
      setPhone(lead.phone ?? '');
      setCountry(lead.country);
      setLeadType(lead.ventureId ? 'venture' : 'service');
      setServiceInterest(lead.serviceInterest || 'marketing');
      setVentureId(lead.ventureId ?? '');
      setSource(lead.source);
      setEstimatedValue(lead.estimatedValue != null ? String(lead.estimatedValue) : '');
      setCurrency(lead.currency ?? 'RWF');
      setAssignedTo(lead.assignedTo ?? '');
      setNotes(lead.notes ?? '');
    }
  }, [open, lead]);

  if (!open || !lead) return null;

  async function handleSubmit(): Promise<void> {
    try {
      await updateLead.mutateAsync({
        leadId: lead!.id,
        payload: {
          contactName,
          companyName: companyName || undefined,
          email,
          phone: phone || undefined,
          country,
          ...(leadType === 'service'
            ? { serviceInterest, ventureId: null }
            : { ventureId: ventureId || undefined }),
          source,
          estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
          currency,
          assignedTo: assignedTo || undefined,
          notes: notes || undefined,
        },
      });
      toast.success('Lead updated');
      onClose();
    } catch {
      /* interceptor */
    }
  }

  const canSubmit =
    !updateLead.isPending &&
    Boolean(contactName) &&
    Boolean(email) &&
    (leadType === 'service' ? Boolean(serviceInterest) : Boolean(ventureId));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Edit Lead</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div>
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Lead type</Label>
            <div className="mt-1 flex overflow-hidden rounded-md border border-cdy-navy-border">
              <button
                type="button"
                onClick={() => setLeadType('service')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  leadType === 'service'
                    ? 'bg-cdy-red text-white'
                    : 'bg-cdy-navy text-cdy-muted hover:text-cdy-white'
                }`}
              >
                Service
              </button>
              <button
                type="button"
                onClick={() => setLeadType('venture')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  leadType === 'venture'
                    ? 'bg-cdy-red text-white'
                    : 'bg-cdy-navy text-cdy-muted hover:text-cdy-white'
                }`}
              >
                Venture
              </button>
            </div>
          </div>

          {leadType === 'service' ? (
            <div>
              <Label>Service interest</Label>
              <select
                value={serviceInterest}
                onChange={(e) => setServiceInterest(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <Label>Venture</Label>
              <select
                value={ventureId}
                onChange={(e) => setVentureId(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
              >
                <option value="">— Select venture —</option>
                {activeVentures.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Lead source</Label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estimated value</Label>
              <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Assign to</Label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            >
              <option value="">Unassigned</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[80px] w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
            />
          </div>
        </div>
        <div className="flex gap-3 border-t border-cdy-navy-border p-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {updateLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  );
}
