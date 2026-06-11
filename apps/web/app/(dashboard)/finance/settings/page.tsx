'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useFinanceSettings } from '@/hooks/useSettings';
import { useTaxRates } from '@/hooks/useTax';
import { AddTaxRateModal } from '@/components/finance/tax/AddTaxRateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type Tab = 'general' | 'invoice' | 'payroll' | 'tax';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function FinanceSettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useFinanceSettings();
  const { data: taxRates } = useTaxRates();
  const [tab, setTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    default_currency: 'USD',
    default_payment_terms: '30',
    fiscal_year_start: '01',
    invoice_prefix: 'CDY',
    invoice_footer_note: '',
    payroll_approver_id: '',
    payroll_tax_rate: '20',
  });

  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        company_name: settings.company_name ?? prev.company_name,
        company_address: settings.company_address ?? prev.company_address,
        company_email: settings.company_email ?? prev.company_email,
        company_phone: settings.company_phone ?? prev.company_phone,
        default_currency: settings.default_currency ?? prev.default_currency,
        default_payment_terms:
          settings.default_payment_terms ?? prev.default_payment_terms,
        fiscal_year_start: settings.fiscal_year_start ?? prev.fiscal_year_start,
        invoice_prefix: settings.invoice_prefix ?? prev.invoice_prefix,
        invoice_footer_note:
          settings.invoice_footer_note ?? prev.invoice_footer_note,
        payroll_approver_id:
          settings.payroll_approver_id ?? prev.payroll_approver_id,
        payroll_tax_rate: settings.payroll_tax_rate ?? prev.payroll_tax_rate,
      }));
    }
  }, [settings]);

  async function saveKeys(keys: (keyof typeof form)[]): Promise<void> {
    setSaving(true);
    try {
      for (const key of keys) {
        await api.patch('/settings', { key, value: form[key] });
      }
      toast.success('Settings saved');
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <InvoiceTableSkeleton />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'tax', label: 'Tax Rates' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'invoice', label: 'Invoice' },
  ];

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Settings</span>
      </nav>

      <h1 className="text-2xl font-bold text-cdy-white">Finance Settings</h1>

      <div className="flex gap-2 border-b border-cdy-navy-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-cdy-red text-cdy-red'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="max-w-lg space-y-4">
          {[
            { key: 'company_name' as const, label: 'Company name' },
            { key: 'company_address' as const, label: 'Company address' },
            { key: 'company_email' as const, label: 'Company email' },
            { key: 'company_phone' as const, label: 'Company phone' },
          ].map((field) => (
            <label key={field.key} className="block text-sm text-cdy-muted">
              {field.label}
              <Input
                value={form[field.key]}
                onChange={(e) =>
                  setForm({ ...form, [field.key]: e.target.value })
                }
                className="mt-1"
              />
            </label>
          ))}
          <label className="block text-sm text-cdy-muted">
            Default currency
            <Input
              value={form.default_currency}
              onChange={(e) =>
                setForm({ ...form, default_currency: e.target.value })
              }
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Default payment terms (days)
            <Input
              value={form.default_payment_terms}
              onChange={(e) =>
                setForm({ ...form, default_payment_terms: e.target.value })
              }
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-cdy-muted">
            Fiscal year start
            <select
              value={form.fiscal_year_start}
              onChange={(e) =>
                setForm({ ...form, fiscal_year_start: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
            onClick={() =>
              void saveKeys([
                'company_name',
                'company_address',
                'company_email',
                'company_phone',
                'default_currency',
                'default_payment_terms',
                'fiscal_year_start',
              ])
            }
          >
            Save General Settings
          </Button>
        </div>
      )}

      {tab === 'invoice' && (
        <div className="max-w-lg space-y-4">
          <label className="block text-sm text-cdy-muted">
            Invoice number prefix
            <Input
              value={form.invoice_prefix}
              onChange={(e) =>
                setForm({ ...form, invoice_prefix: e.target.value })
              }
              className="mt-1"
            />
            <span className="mt-1 block text-xs text-cdy-muted">
              Preview: {form.invoice_prefix}-2026-0001
            </span>
          </label>
          <label className="block text-sm text-cdy-muted">
            Invoice footer note
            <textarea
              value={form.invoice_footer_note}
              onChange={(e) =>
                setForm({ ...form, invoice_footer_note: e.target.value })
              }
              rows={4}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
            />
          </label>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
            onClick={() =>
              void saveKeys(['invoice_prefix', 'invoice_footer_note'])
            }
          >
            Save Invoice Settings
          </Button>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="max-w-lg space-y-4">
          <label className="block text-sm text-cdy-muted">
            Second approver (user ID)
            <Input
              value={form.payroll_approver_id}
              onChange={(e) =>
                setForm({ ...form, payroll_approver_id: e.target.value })
              }
              className="mt-1"
            />
            <span className="mt-1 block text-xs text-cdy-muted">
              The payroll run creator cannot process their own run.
            </span>
          </label>
          <label className="block text-sm text-cdy-muted">
            Tax rate (flat) %
            <Input
              type="number"
              value={form.payroll_tax_rate}
              onChange={(e) =>
                setForm({ ...form, payroll_tax_rate: e.target.value })
              }
              className="mt-1"
            />
          </label>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={saving}
            onClick={() =>
              void saveKeys(['payroll_approver_id', 'payroll_tax_rate'])
            }
          >
            Save Payroll Settings
          </Button>
        </div>
      )}

      {tab === 'tax' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-cdy-muted">
              Manage tax rates applied to invoices and retainers.
            </p>
            <Button
              className="bg-cdy-red hover:bg-cdy-red/90"
              onClick={() => setTaxModalOpen(true)}
            >
              Add Tax Rate
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium text-right">Rate</th>
                  <th className="px-4 py-3 font-medium">From</th>
                </tr>
              </thead>
              <tbody>
                {(taxRates ?? [])
                  .filter((r) => r.isActive)
                  .map((r) => (
                    <tr key={r.id} className="border-b border-cdy-navy-border/50">
                      <td className="px-4 py-3 text-cdy-white">{r.name}</td>
                      <td className="px-4 py-3 text-cdy-muted">{r.country}</td>
                      <td className="px-4 py-3 text-right text-cdy-white">
                        {r.ratePercent}%
                      </td>
                      <td className="px-4 py-3 text-cdy-muted">
                        {format(new Date(r.effectiveFrom), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Link
            href="/finance/settings/tax"
            className="text-sm text-cdy-red hover:underline"
          >
            Open full tax rates page →
          </Link>
        </div>
      )}

      {taxModalOpen && (
        <AddTaxRateModal
          open={taxModalOpen}
          onClose={() => setTaxModalOpen(false)}
        />
      )}
    </div>
  );
}
