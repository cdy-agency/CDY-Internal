'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse, ClientSearchResult, InvoiceDetail, InvoiceRecord } from '@cdy/shared';
import { InvoiceStatus } from '@cdy/shared';
import { ClientSearch } from '@/components/crm/ClientSearch';
import { AddClientDrawer } from '@/components/crm/clients/AddClientDrawer';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectId: z.string().optional(),
  currency: z.string().default('RWF'),
  dueDate: z.string().min(1, 'Due date is required'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice?: InvoiceDetail | InvoiceRecord | null;
}

const CURRENCIES = ['RWF'];

export function InvoiceDrawer({
  open,
  onClose,
  invoice,
}: InvoiceDrawerProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const [submitAction, setSubmitAction] = useState<'draft' | 'send' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createClientName, setCreateClientName] = useState('');

  const isEdit = Boolean(invoice);
  const isReadOnly = isEdit && invoice?.status !== InvoiceStatus.DRAFT;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(
      invoiceSchema as never,
    ) as unknown as Resolver<InvoiceFormValues>,
    defaultValues: {
      clientId: '',
      projectId: '',
      currency: 'RWF',
      dueDate: '',
      taxRate: 0,
      notes: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const watchedItems = watch('lineItems');
  const watchedTaxRate = watch('taxRate') ?? 0;
  const watchedCurrency = watch('currency') ?? 'RWF';

  useEffect(() => {
    if (open && invoice) {
      reset({
        clientId: invoice.clientId,
        projectId: invoice.projectId ?? '',
        currency: invoice.currency,
        dueDate: invoice.dueDate.split('T')[0],
        taxRate: invoice.taxRate,
        notes: invoice.notes ?? '',
        lineItems: invoice.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      setSelectedClient({
        id: invoice.clientId,
        companyName: invoice.clientId,
        contactName: invoice.clientId,
        email: '',
        country: 'RW',
      });
    } else if (open && !invoice) {
      reset({
        clientId: '',
        projectId: '',
        currency: 'RWF',
        dueDate: '',
        taxRate: 0,
        notes: '',
        lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      });
      setSelectedClient(null);
    }
  }, [open, invoice, reset]);

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );
  const taxAmount = subtotal * (watchedTaxRate / 100);
  const total = subtotal + taxAmount;

  const fmt = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: watchedCurrency,
    }).format(value);

  async function onSubmit(
    data: InvoiceFormValues,
    action: 'draft' | 'send',
  ): Promise<void> {
    setSubmitAction(action);
    setStatusText('');

    try {
      let savedInvoice: InvoiceRecord;

      if (isEdit && invoice) {
        const response = await api.patch<ApiResponse<InvoiceRecord>>(
          `/invoices/${invoice.id}`,
          data,
        );
        savedInvoice = response.data.data;
        toast.success(`Invoice ${savedInvoice.invoiceNumber} updated`);
      } else {
        const response = await api.post<ApiResponse<InvoiceRecord>>(
          '/invoices',
          data,
        );
        savedInvoice = response.data.data;
      }

      if (action === 'send') {
        setStatusText('Generating PDF...');
        await new Promise((r) => setTimeout(r, 300));
        setStatusText('Sending email...');
        await api.post(`/invoices/${savedInvoice.id}/send`, {});
        toast.success(`Invoice ${savedInvoice.invoiceNumber} sent to client`);
      } else if (!isEdit) {
        toast.success(`Invoice ${savedInvoice.invoiceNumber} created`);
      }

      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (savedInvoice.id) {
        await queryClient.invalidateQueries({ queryKey: ['invoice', savedInvoice.id] });
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save invoice';
      const axiosMsg =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data
          ? String((error.response.data as { message: string }).message)
          : message;
      toast.error(axiosMsg);
    } finally {
      setSubmitAction(null);
      setStatusText('');
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
            {isEdit
              ? `Edit Invoice ${invoice?.invoiceNumber ?? ''}`
              : 'New Invoice'}
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
          <div className="border-b border-cdy-navy-border bg-cdy-red-light px-6 py-3 text-sm text-cdy-red">
            This invoice has been sent and cannot be edited
          </div>
        )}

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit((data) => onSubmit(data, 'draft'))}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label>Client</Label>
              {isReadOnly ? (
                <Input value={invoice?.clientId ?? ''} disabled />
              ) : (
                <ClientSearch
                  value={selectedClient}
                  onChange={(client) => {
                    setSelectedClient(client);
                    setValue('clientId', client?.id ?? '', { shouldValidate: true });
                  }}
                  onCreateClient={(name) => {
                    setCreateClientName(name);
                    setCreateClientOpen(true);
                  }}
                />
              )}
              {errors.clientId && (
                <p className="text-xs text-[var(--cdy-danger)]">{errors.clientId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID (optional)</Label>
                <Input
                  id="projectId"
                  {...register('projectId')}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  {...register('currency')}
                  disabled={isReadOnly}
                  className="flex h-10 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cdy-red"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register('dueDate')}
                  disabled={isReadOnly}
                />
                {errors.dueDate && (
                  <p className="text-xs text-[var(--cdy-danger)]">{errors.dueDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate %</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  {...register('taxRate')}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <textarea
                id="notes"
                {...register('notes')}
                disabled={isReadOnly}
                rows={2}
                className="flex w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cdy-red"
              />
            </div>

            <div>
              <Label className="mb-3 block">Line Items</Label>
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const qty = watchedItems[index]?.quantity ?? 0;
                  const price = watchedItems[index]?.unitPrice ?? 0;
                  const amount = qty * price;

                  return (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Input
                          placeholder="Description"
                          {...register(`lineItems.${index}.description`)}
                          disabled={isReadOnly}
                        />
                        {errors.lineItems?.[index]?.description && (
                          <p className="text-xs text-[var(--cdy-danger)]">
                            {errors.lineItems[index]?.description?.message}
                          </p>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        className="w-20"
                        {...register(`lineItems.${index}.quantity`)}
                        disabled={isReadOnly}
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-28"
                        {...register(`lineItems.${index}.unitPrice`)}
                        disabled={isReadOnly}
                      />
                      <div className="flex w-28 items-center justify-end pt-2 text-sm text-cdy-white">
                        {fmt(amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={isReadOnly || fields.length <= 1}
                        className="mt-2 rounded p-1 text-cdy-muted hover:bg-cdy-red-light hover:text-cdy-red disabled:opacity-30"
                        aria-label="Remove line item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!isReadOnly && fields.length < 20 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="h-4 w-4" />
                  Add line item
                </Button>
              )}
              {errors.lineItems?.root && (
                <p className="mt-1 text-xs text-[var(--cdy-danger)]">
                  {errors.lineItems.root.message}
                </p>
              )}
            </div>

            <div className="space-y-1 border-t border-cdy-navy-border pt-4 text-right text-sm">
              <p className="text-cdy-muted">
                Subtotal: <span className="text-cdy-white">{fmt(subtotal)}</span>
              </p>
              {watchedTaxRate > 0 && (
                <p className="text-cdy-muted">
                  Tax ({watchedTaxRate}%):{' '}
                  <span className="text-cdy-white">{fmt(taxAmount)}</span>
                </p>
              )}
              <p className="text-lg font-bold text-cdy-white">
                Total: {fmt(total)}
              </p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="border-t border-cdy-navy-border px-6 py-4">
              {statusText && (
                <p className="mb-3 text-center text-sm text-cdy-muted">{statusText}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  className="flex-1"
                  disabled={submitAction !== null}
                >
                  {submitAction === 'draft' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={submitAction !== null}
                  onClick={handleSubmit((data) => onSubmit(data, 'send'))}
                >
                  {submitAction === 'send' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Send Now
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      <AddClientDrawer
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        initialCompanyName={createClientName}
        onSuccess={(clientId) => {
          setSelectedClient({
            id: clientId,
            companyName: createClientName,
            contactName: '',
            email: '',
            country: 'RW',
          });
          setValue('clientId', clientId, { shouldValidate: true });
        }}
      />
    </>
  );
}
