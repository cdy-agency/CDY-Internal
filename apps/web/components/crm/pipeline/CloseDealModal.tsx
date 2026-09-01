'use client';

import { useEffect, useState } from 'react';
import { useLead, useLostReasons, useMoveLeadStage } from '@/hooks/useCrm';
import { PipelineStage } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ChevronDown, ChevronUp, FileText, RefreshCw } from 'lucide-react';

interface CloseDealModalProps {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CloseDealModal({
  open,
  leadId,
  onClose,
  onSuccess,
}: CloseDealModalProps): JSX.Element | null {
  const moveStage = useMoveLeadStage();
  const { data: presetReasons } = useLostReasons();
  const { data: lead } = useLead(leadId ?? '');
  const [mode, setMode] = useState<'won' | 'lost'>('won');
  const [wonOutcome, setWonOutcome] = useState<'invoice' | 'retainer' | ''>('');
  const [lostReason, setLostReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [finalValue, setFinalValue] = useState('');
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (open && lead) {
      setFinalValue(lead.estimatedValue ? String(lead.estimatedValue) : '');
      setCompanyName(lead.companyName ?? '');
      setContactName(lead.contactName ?? '');
      setEmail(lead.email ?? '');
      setPhone(lead.phone ?? '');
    }
  }, [open, lead]);

  if (!open || !leadId) return null;

  const reasons = presetReasons ?? [];

  function reset() {
    setMode('won');
    setWonOutcome('');
    setLostReason('');
    setCustomReason('');
    setFinalValue('');
    setEditInfoOpen(false);
  }

  async function confirm(): Promise<void> {
    const reason =
      mode === 'lost'
        ? lostReason === 'Other'
          ? customReason.trim()
          : lostReason
        : undefined;

    if (mode === 'lost' && !reason) return;

    await moveStage.mutateAsync({
      leadId: leadId as string,
      stage: mode === 'won' ? PipelineStage.CLOSED_WON : PipelineStage.CLOSED_LOST,
      lostReason: reason,
      wonOutcome: mode === 'won' ? (wonOutcome as 'invoice' | 'retainer') : undefined,
      ...(mode === 'won' && {
        finalValue: parseFloat(finalValue),
        companyName: companyName.trim() || undefined,
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    });

    onSuccess?.();
    onClose();
    reset();
  }

  const parsedFinalValue = parseFloat(finalValue);
  const canConfirm =
    !moveStage.isPending &&
    (mode === 'won'
      ? Boolean(wonOutcome) && parsedFinalValue > 0
      : Boolean(lostReason === 'Other' ? customReason.trim() : lostReason));

  const outcomeLink =
    wonOutcome === 'retainer' ? '/finance/retainers' : '/finance/invoices';
  const outcomeLinkLabel =
    wonOutcome === 'retainer' ? 'Finance → Retainers' : 'Finance → Invoices';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">Close this lead?</h2>

        {/* Won / Lost choice */}
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              checked={mode === 'won'}
              onChange={() => { setMode('won'); setWonOutcome(''); }}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-cdy-white">Closed Won</span>
              <span className="block text-sm text-cdy-muted">
                Converts lead to client and calculates commission.
              </span>
            </span>
          </label>

          {/* Invoice / Retainer choice — only shown when Won is selected */}
          {mode === 'won' && (
            <div className="ml-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWonOutcome('invoice')}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors ${
                  wonOutcome === 'invoice'
                    ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                    : 'border-cdy-navy-border bg-cdy-navy text-cdy-muted hover:border-cdy-red/50 hover:text-cdy-white'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">Invoice</span>
                <span className="text-center text-xs opacity-75">One-time payment</span>
              </button>
              <button
                type="button"
                onClick={() => setWonOutcome('retainer')}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors ${
                  wonOutcome === 'retainer'
                    ? 'border-cdy-red bg-cdy-red/10 text-cdy-white'
                    : 'border-cdy-navy-border bg-cdy-navy text-cdy-muted hover:border-cdy-red/50 hover:text-cdy-white'
                }`}
              >
                <RefreshCw className="h-5 w-5" />
                <span className="font-medium">Retainer</span>
                <span className="text-center text-xs opacity-75">Recurring contract</span>
              </button>
            </div>
          )}

          {/* Final value — required to close as won */}
          {mode === 'won' && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="final-value">Final deal value *</Label>
              <Input
                id="final-value"
                type="number"
                min="0.01"
                step="0.01"
                value={finalValue}
                onChange={(e) => setFinalValue(e.target.value)}
                placeholder="Confirmed amount for this deal"
              />
              <p className="text-xs text-cdy-muted">
                Drives the invoice/retainer amount and commission — confirm the
                real final value even if it differs from the original estimate.
              </p>
            </div>
          )}

          {/* Optional: correct client/lead contact info before converting */}
          {mode === 'won' && (
            <div className="ml-6">
              <button
                type="button"
                onClick={() => setEditInfoOpen((v) => !v)}
                className="flex items-center gap-1 text-sm text-cdy-muted hover:text-cdy-white"
              >
                {editInfoOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Edit client/lead info
              </button>
              {editInfoOpen && (
                <div className="mt-2 space-y-3 rounded-lg border border-cdy-navy-border bg-cdy-navy p-3">
                  <div className="space-y-1">
                    <Label htmlFor="close-company">Company name</Label>
                    <Input
                      id="close-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="close-contact">Contact name</Label>
                    <Input
                      id="close-contact"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="close-email">Email</Label>
                    <Input
                      id="close-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="close-phone">Phone</Label>
                    <Input
                      id="close-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-cdy-muted">
                    These corrections are saved on the lead. The email must
                    not already belong to an existing client.
                  </p>
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              checked={mode === 'lost'}
              onChange={() => { setMode('lost'); setWonOutcome(''); }}
              className="mt-1"
            />
            <span className="w-full">
              <span className="font-medium text-cdy-white">Closed Lost</span>
              {mode === 'lost' && (
                <div className="mt-2 space-y-2">
                  {reasons.length > 0 ? (
                    <select
                      className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                    >
                      <option value="">Select reason...</option>
                      {reasons.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="Reason (required)"
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                    />
                  )}
                  {lostReason === 'Other' && (
                    <Input
                      placeholder="Describe reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  )}
                </div>
              )}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>
            Cancel
          </Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={!canConfirm}
            onClick={() => void confirm()}
          >
            {moveStage.isPending ? 'Closing…' : 'Confirm'}
          </Button>
        </div>

        {mode === 'won' && wonOutcome && (
          <p className="mt-3 text-xs text-cdy-muted">
            A draft {wonOutcome} will be created. Review it in{' '}
            <Link href={outcomeLink} className="text-cdy-red hover:underline">
              {outcomeLinkLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
