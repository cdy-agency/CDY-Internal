'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ApiResponse, ReconciliationImportResult } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface ImportStatementModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportStatementModal({
  open,
  onClose,
}: ImportStatementModalProps): JSX.Element | null {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setProgress(0);
    setLoading(false);
  }, []);

  function handleClose(): void {
    if (loading) return;
    reset();
    onClose();
  }

  function acceptFile(selected: File | null): void {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(selected);
  }

  async function handleImport(): Promise<void> {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('statement', file);

    try {
      setProgress(50);
      const response = await api.post<
        ApiResponse<ReconciliationImportResult>
      >('/reconciliation/import', formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(50 + Math.round((event.loaded / event.total) * 40));
          }
        },
      });

      setProgress(100);
      toast.success(
        `Imported ${response.data.data.transactionCount} transactions — ${response.data.data.matchedCount} matched`,
      );
      handleClose();
      router.push(`/finance/reconciliation/${response.data.data.statementId}`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axiosErr.response?.data?.message ?? 'Failed to import statement',
      );
      setLoading(false);
      setProgress(0);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={handleClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl border border-cdy-navy-border bg-cdy-navy-light p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cdy-white">
              Upload Bank Statement
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-md p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-4 text-sm text-cdy-muted">
            Drag and drop your CSV file here, or click to browse. Supported
            formats include standard bank CSV exports (Date, Description, Debit,
            Credit, Balance).
          </p>

          <div
            className={`mb-4 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragOver
                ? 'border-cdy-red bg-cdy-red-light/10'
                : 'border-cdy-navy-border bg-cdy-navy/30'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files[0] ?? null);
            }}
            onClick={() => document.getElementById('csv-upload')?.click()}
            role="presentation"
          >
            <Upload className="mb-2 h-8 w-8 text-cdy-muted" />
            {file ? (
              <p className="text-sm text-cdy-white">{file.name}</p>
            ) : (
              <p className="text-sm text-cdy-muted">Drop file here</p>
            )}
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {loading && (
            <div className="mb-4">
              <div className="h-2 overflow-hidden rounded-full bg-cdy-navy">
                <div
                  className="h-full bg-cdy-red transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-cdy-muted">
                Parsing and auto-matching...
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-cdy-red hover:bg-cdy-red/90"
              onClick={handleImport}
              disabled={loading || !file}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Import & Match'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
