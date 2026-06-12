'use client';

import { useRef, useState } from 'react';
import type { TaskImportResult } from '@cdy/shared';
import { Button } from '@/components/ui/button';

const CSV_TEMPLATE = `Title,Description,Milestone,Assignee,Priority,Due Date,Estimated Hours
"Build homepage","Main homepage with nav and hero","Frontend Development","nadia@cdy.com","HIGH","2026-07-30","8"`;

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<TaskImportResult>;
  isPending: boolean;
  onViewTasks?: () => void;
}

export function CsvImportModal({
  open,
  onClose,
  onImport,
  isPending,
  onViewTasks,
}: CsvImportModalProps): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<TaskImportResult | null>(null);

  if (!open) return null;

  function handleClose(): void {
    setResult(null);
    onClose();
  }

  function downloadTemplate(): void {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function processFile(file: File): Promise<void> {
    const data = await onImport(file);
    setResult(data);
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-cdy-white">
          Import Tasks from CSV
        </h2>

        {!result ? (
          <>
            <p className="mt-2 text-sm text-cdy-muted">
              Download template:{' '}
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-cdy-red hover:underline"
              >
                📄 Download CSV template
              </button>
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-cdy-red bg-cdy-red/10'
                  : 'border-cdy-navy-border'
              }`}
            >
              <p className="text-sm text-cdy-muted">
                Drag & drop your CSV file here
              </p>
              <p className="mt-2 text-sm text-cdy-muted">or</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => inputRef.current?.click()}
                disabled={isPending}
              >
                Browse files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processFile(file);
                }}
              />
            </div>

            <p className="mt-4 text-xs text-cdy-muted">
              Required columns: Title. Optional: Description, Milestone,
              Assignee (email), Priority, Due Date, Estimated Hours
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm font-medium text-cdy-white">
              Import complete
            </p>
            <p className="mt-2 text-sm text-emerald-400">
              ✅ {result.imported} task{result.imported !== 1 ? 's' : ''}{' '}
              imported successfully
            </p>
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-amber-400">
                  ⚠ {result.errors.length} warning
                  {result.errors.length > 1 ? 's' : ''}:
                </p>
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-cdy-muted">
                  {result.errors.map((err) => (
                    <li key={err}>· {err}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              {onViewTasks && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onViewTasks();
                    handleClose();
                  }}
                >
                  View imported tasks
                </Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
