'use client';

import { useState } from 'react';
import { useLostReasons, useMoveLeadStage } from '@/hooks/useCrm';
import { PipelineStage } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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
  const [mode, setMode] = useState<'won' | 'lost'>('won');
  const [lostReason, setLostReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!open || !leadId) return null;

  const resolvedLeadId = leadId;
  const reasons = presetReasons ?? [];

  async function confirm(): Promise<void> {
    const reason =
      mode === 'lost'
        ? lostReason === 'Other'
          ? customReason.trim()
          : lostReason
        : undefined;

    if (mode === 'lost' && !reason) return;

    await moveStage.mutateAsync({
      leadId: resolvedLeadId,
      stage:
        mode === 'won' ? PipelineStage.CLOSED_WON : PipelineStage.CLOSED_LOST,
      lostReason: reason,
    });

    onSuccess?.();
    onClose();
    setLostReason('');
    setCustomReason('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
        <h2 className="text-lg font-semibold text-cdy-white">Close this lead?</h2>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              checked={mode === 'won'}
              onChange={() => setMode('won')}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-cdy-white">Closed Won</span>
              <span className="block text-sm text-cdy-muted">
                This will create a draft invoice and calculate commission.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              checked={mode === 'lost'}
              onChange={() => setMode('lost')}
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
                        <option key={r} value={r}>
                          {r}
                        </option>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={
              moveStage.isPending ||
              (mode === 'lost' &&
                !(lostReason === 'Other' ? customReason.trim() : lostReason))
            }
            onClick={() => void confirm()}
          >
            Confirm
          </Button>
        </div>
        {mode === 'won' && (
          <p className="mt-3 text-xs text-cdy-muted">
            After confirm, review the draft invoice in{' '}
            <Link href="/finance/invoices" className="text-cdy-red hover:underline">
              Finance → Invoices
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
