'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { X, Loader2, Upload, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EXPENSE_CATEGORIES } from '@/components/finance/expenses/ExpenseCategoryBadge';
import type { ApiResponse, ExpenseRecord } from '@cdy/shared';
import { ExpenseCategory } from '@cdy/shared';
import type { AxiosError } from 'axios';

interface ExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  expense?: ExpenseRecord | null;
}

const CURRENCIES = ['RWF'];

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExpenseDrawer({
  open,
  onClose,
  expense,
}: ExpenseDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isEdit = Boolean(expense);
  const isReadOnly = isEdit && expense ? !expense.canEdit : false;

  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(
    ExpenseCategory.OTHER,
  );
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('RWF');
  const [date, setDate] = useState(todayString());
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && expense) {
      setVendorName(expense.vendorName);
      setCategory(expense.category);
      setAmount(String(expense.amount));
      setCurrency(expense.currency);
      setDate(expense.date.split('T')[0]);
      setProjectId(expense.projectId ?? '');
      setNotes(expense.notes ?? '');
      setPaymentMethod((expense as unknown as Record<string, string>).paymentMethod ?? '');
      setPaymentReference((expense as unknown as Record<string, string>).paymentReference ?? '');
      setReceiptFile(null);
      setPreviewUrl(null);
    } else if (open && !expense) {
      setVendorName('');
      setCategory(ExpenseCategory.OTHER);
      setAmount('');
      setCurrency('RWF');
      setDate(todayString());
      setProjectId('');
      setNotes('');
      setPaymentMethod('');
      setPaymentReference('');
      setReceiptFile(null);
      setPreviewUrl(null);
    }
  }, [open, expense]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelect(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Allowed file types: JPEG, PNG, PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('vendorName', vendorName);
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('date', date);
      if (projectId) formData.append('projectId', projectId);
      if (notes) formData.append('notes', notes);
      if (receiptFile) formData.append('receipt', receiptFile);

      if (paymentMethod) formData.append('paymentMethod', paymentMethod);
      if (paymentReference) formData.append('paymentReference', paymentReference);

      if (isEdit && expense) {
        await api.patch<ApiResponse<ExpenseRecord>>(
          `/expenses/${expense.id}`,
          {
            vendorName,
            category,
            amount: parseFloat(amount),
            currency,
            date,
            projectId: projectId || undefined,
            notes: notes || undefined,
            paymentMethod: paymentMethod || undefined,
            paymentReference: paymentReference || undefined,
          },
        );
        toast.success('Expense updated');
      } else {
        await api.post<ApiResponse<ExpenseRecord>>('/expenses', formData, {
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        });
        toast.success('Expense logged');
      }

      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      toast.error(axiosErr.response?.data?.message ?? 'Failed to save expense');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-cdy-navy-light shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-6 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">
            {isEdit ? 'Edit Expense' : 'Log Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isReadOnly && (
          <div className="border-b border-cdy-navy-border bg-amber-500/10 px-6 py-3 text-sm text-amber-400">
            This expense was logged more than 24 hours ago and can no longer be
            edited.
          </div>
        )}

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory)
                }
                disabled={isReadOnly}
                className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {EXPENSE_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isReadOnly}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID (optional)</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label>Receipt Upload</Label>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-cdy-navy-border bg-cdy-navy/30 px-4 py-8 transition-colors hover:border-cdy-red/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Upload className="mb-2 h-8 w-8 text-cdy-muted" />
                  <p className="text-sm text-cdy-muted">
                    Drag & drop or click to browse
                  </p>
                  <p className="mt-1 text-xs text-cdy-muted">
                    PDF, JPG, PNG — max 5MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
                {receiptFile && (
                  <div className="flex items-center gap-3 rounded-lg border border-cdy-navy-border bg-cdy-navy/50 p-3">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-cdy-muted" />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="text-cdy-white">{receiptFile.name}</p>
                      <p className="text-cdy-muted">
                        {formatFileSize(receiptFile.size)}
                      </p>
                    </div>
                  </div>
                )}
                {loading && uploadProgress > 0 && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-cdy-navy">
                    <div
                      className="h-full bg-cdy-red transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment Method (optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['BANK_TRANSFER', 'MTN_MOMO', 'AIRTEL_MONEY', 'CARD', 'CASH', 'OTHER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      paymentMethod === method
                        ? 'border-cdy-red bg-cdy-red/20 text-cdy-red'
                        : 'border-cdy-navy-border bg-cdy-navy text-cdy-muted hover:border-cdy-red/50 hover:text-cdy-white'
                    }`}
                  >
                    {method.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              {paymentMethod && (
                <Input
                  placeholder="Reference / transaction ID (optional)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={isReadOnly}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isReadOnly}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-2 focus:ring-cdy-red"
              />
            </div>
          </div>

          <div className="border-t border-cdy-navy-border px-6 py-4">
            {isReadOnly ? (
              <Button type="button" variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            ) : (
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  'Update Expense'
                ) : (
                  'Log Expense'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
