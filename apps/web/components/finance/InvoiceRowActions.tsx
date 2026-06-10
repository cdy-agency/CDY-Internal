'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Eye, Pencil, Send, Download, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import type { InvoiceRecord } from '@cdy/shared';
import { InvoiceStatus } from '@cdy/shared';

interface InvoiceRowActionsProps {
  invoice: InvoiceRecord;
  onEdit: (invoice: InvoiceRecord) => void;
}

export function InvoiceRowActions({
  invoice,
  onEdit,
}: InvoiceRowActionsProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSend(): Promise<void> {
    try {
      await api.post(`/invoices/${invoice.id}/send`, {});
      toast.success(`Invoice ${invoice.invoiceNumber} sent`);
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch {
      /* toast handled by interceptor */
    }
    setOpen(false);
  }

  async function handleDelete(): Promise<void> {
    try {
      await api.delete(`/invoices/${invoice.id}`);
      toast.success('Invoice deleted');
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch {
      /* toast handled by interceptor */
    }
    setOpen(false);
  }

  async function handleDownload(): Promise<void> {
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch {
      toast.error('Failed to download PDF');
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-cdy-navy-border bg-cdy-navy-light py-1 shadow-lg">
          <Link
            href={`/finance/invoices/${invoice.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-cdy-white hover:bg-cdy-navy"
            onClick={() => setOpen(false)}
          >
            <Eye className="h-4 w-4" /> View
          </Link>
          {invoice.status === InvoiceStatus.DRAFT && (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-cdy-white hover:bg-cdy-navy"
                onClick={() => {
                  onEdit(invoice);
                  setOpen(false);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-cdy-white hover:bg-cdy-navy"
                onClick={handleSend}
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-cdy-white hover:bg-cdy-navy"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
          {invoice.status !== InvoiceStatus.PAID && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--cdy-danger)] hover:bg-cdy-navy"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
