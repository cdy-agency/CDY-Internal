'use client';

import { useState } from 'react';
import type { TaskRecord } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CompleteProjectModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  projectCode: string;
  incompleteTasks: TaskRecord[];
  onComplete: (payload: {
    acknowledgeIncompleteTasks: boolean;
    completionNotes?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function CompleteProjectModal({
  open,
  onClose,
  projectName,
  projectCode,
  incompleteTasks,
  onComplete,
  isPending,
}: CompleteProjectModalProps): JSX.Element | null {
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledge, setAcknowledge] = useState(false);
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const hasIssues = incompleteTasks.length > 0;

  function handleClose(): void {
    setStep(1);
    setAcknowledge(false);
    setNotes('');
    onClose();
  }

  async function handleSubmit(): Promise<void> {
    await onComplete({
      acknowledgeIncompleteTasks: incompleteTasks.length > 0 ? acknowledge : true,
      completionNotes: notes.trim() || undefined,
    });
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl">
        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-cdy-white">
              Complete Project
            </h2>
            <p className="mt-1 text-sm text-cdy-muted">
              Completing: {projectName}
            </p>

            <div className="mt-6 space-y-4">
              <p className="text-sm font-medium text-cdy-white">
                Checklist before completing:
              </p>

              {incompleteTasks.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-400">
                    ☐ {incompleteTasks.length} task
                    {incompleteTasks.length > 1 ? 's' : ''} not yet marked DONE
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-cdy-muted">
                    {incompleteTasks.slice(0, 5).map((t) => (
                      <li key={t.id}>· {t.title}</li>
                    ))}
                    {incompleteTasks.length > 5 && (
                      <li>· +{incompleteTasks.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {!hasIssues && (
                <p className="text-sm text-emerald-400">
                  ✅ All tasks complete. Ready to close.
                </p>
              )}

              {hasIssues && (
                <div className="space-y-2">
                  <p className="text-sm text-cdy-muted">
                    How would you like to proceed?
                  </p>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!acknowledge}
                      onChange={() => setAcknowledge(false)}
                      className="mt-1"
                    />
                    <span className="text-cdy-muted">
                      I&apos;ll complete those tasks first (recommended)
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      checked={acknowledge}
                      onChange={() => setAcknowledge(true)}
                      className="mt-1"
                    />
                    <span className="text-cdy-white">
                      Continue — I acknowledge these tasks are incomplete
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {hasIssues && !acknowledge ? (
                <Button variant="outline" disabled>
                  Continue →
                </Button>
              ) : (
                <Button onClick={() => setStep(2)}>Continue →</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-cdy-white">
              Completion Notes
            </h2>
            <p className="mt-1 text-sm text-cdy-muted">{projectCode}</p>

            <div className="mt-6">
              <Label htmlFor="completion-notes" className="text-cdy-muted">
                Completion notes (optional)
              </Label>
              <textarea
                id="completion-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any final notes about the project completion..."
                className="mt-2 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={isPending}
                className={cn(isPending && 'opacity-50')}
              >
                Complete Project
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
