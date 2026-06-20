'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeadSource } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLead, useSalesAgents } from '@/hooks/useCrm';
import {
  calculateLeadScore,
  getScoreBand,
  scoreBandLabel,
} from '@/lib/leadScoring';

const SERVICE_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'software_dev', label: 'Software Dev' },
  { value: 'branding', label: 'Branding' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'sales_services', label: 'Sales Services' },
  { value: 'tech', label: 'Tech' },
  { value: 'other', label: 'Other' },
];

const SOURCE_OPTIONS = Object.values(LeadSource);

interface AddLeadDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AddLeadDrawer({ open, onClose }: AddLeadDrawerProps): JSX.Element | null {
  const { data: agents } = useSalesAgents();
  const createLead = useCreateLead();
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('RW');
  const [serviceInterest, setServiceInterest] = useState('marketing');
  const [source, setSource] = useState<LeadSource>(LeadSource.REFERRAL);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const score = useMemo(
    () =>
      calculateLeadScore({
        source,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        hasPhone: Boolean(phone),
        hasEmail: Boolean(email),
      }),
    [source, estimatedValue, phone, email],
  );
  const band = getScoreBand(score);

  useEffect(() => {
    if (!open) {
      setContactName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setEstimatedValue('');
      setNotes('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(): Promise<void> {
    try {
      await createLead.mutateAsync({
        contactName,
        companyName,
        email,
        phone: phone || undefined,
        country,
        serviceInterest,
        source,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        currency,
        assignedTo: assignedTo || undefined,
        notes: notes || undefined,
      });
      toast.success(`Lead added — ${companyName}`);
      onClose();
    } catch {
      /* interceptor */
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} role="presentation" />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Add Lead</h2>
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
          <div>
            <Label>Lead source</Label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="mt-1 h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
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
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy p-4">
            <p className="mb-2 text-xs uppercase text-cdy-muted">Quality score preview</p>
            <div className="h-2 overflow-hidden rounded-full bg-cdy-navy-border">
              <div
                className="h-full bg-cdy-red transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-cdy-white">
              Score: {score} — {scoreBandLabel(band)}
            </p>
          </div>
        </div>
        <div className="flex gap-3 border-t border-cdy-navy-border p-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
            disabled={createLead.isPending || !contactName || !companyName || !email}
            onClick={() => void handleSubmit()}
          >
            {createLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Lead'}
          </Button>
        </div>
      </div>
    </>
  );
}
