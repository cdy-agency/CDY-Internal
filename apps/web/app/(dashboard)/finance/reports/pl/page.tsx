'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { usePlReport } from '@/hooks/useReports';
import { ReportFilterBar } from '@/components/finance/reports/ReportFilterBar';
import { ReportTable, type ReportSection } from '@/components/finance/reports/ReportTable';
import { EmptyReport } from '@/components/finance/reports/EmptyReport';
import { InvoiceTableSkeleton } from '@/components/finance/skeletons/InvoiceTableSkeleton';
import {
  buildPlPresets,
  SERVICE_TYPE_OPTIONS,
  serviceTypeLabel,
} from '@/lib/reportDates';
import { downloadReportPdf } from '@/lib/reportPdf';
import { ExpenseCategory } from '@cdy/shared';
import { FeatureReadGate } from '@/components/FeatureReadGate';

const presets = buildPlPresets();

function categoryLabel(cat: ExpenseCategory): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

export default function ProfitAndLossPage(): JSX.Element {
  const [activePreset, setActivePreset] = useState('this-month');
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [serviceType, setServiceType] = useState('all');
  const [pdfLoading, setPdfLoading] = useState(false);

  const filters = {
    from,
    to,
    serviceType: serviceType === 'all' ? undefined : serviceType,
  };

  const { data, isLoading, isError } = usePlReport(filters);

  function handlePreset(preset: (typeof presets)[0]): void {
    setActivePreset(preset.id);
    setFrom(preset.from);
    setTo(preset.to);
  }

  async function handleDownload(): Promise<void> {
    setPdfLoading(true);
    try {
      await downloadReportPdf(
        '/reports/pl/pdf',
        `CDY-PL-Report-${format(new Date(), 'MMM-yyyy')}.pdf`,
        filters,
      );
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  const sections: ReportSection[] = data
    ? [
        {
          title: 'Revenue',
          rows: [
            ...data.revenue.byServiceType.map((r) => ({
              label: serviceTypeLabel(r.serviceType),
              current: r.amount,
              previous:
                data.previousPeriod.revenueByServiceType.find(
                  (p) => p.serviceType === r.serviceType,
                )?.amount ?? 0,
            })),
            {
              label: 'TOTAL REVENUE',
              current: data.revenue.total,
              previous: data.previousPeriod.totalRevenue,
              isTotal: true,
            },
          ],
        },
        {
          title: 'Cost of Services',
          rows: [
            ...data.costOfServices.byCategory.map((r) => ({
              label: categoryLabel(r.category),
              current: r.amount,
              previous:
                data.previousPeriod.cogsByCategory.find(
                  (p) => p.category === r.category,
                )?.amount ?? 0,
            })),
            {
              label: 'TOTAL COGS',
              current: data.costOfServices.total,
              previous: data.previousPeriod.totalCOGS,
              isTotal: true,
            },
            {
              label: 'GROSS PROFIT',
              current: data.grossProfit,
              previous: data.previousPeriod.grossProfit,
              isHighlight: true,
            },
            {
              label: 'GROSS MARGIN',
              current: data.grossMargin,
              previous: data.previousPeriod.grossMargin,
              isPercent: true,
            },
          ],
        },
        {
          title: 'Operating Expenses',
          rows: [
            ...data.operatingExpenses.byCategory.map((r) => ({
              label: categoryLabel(r.category),
              current: r.amount,
              previous:
                data.previousPeriod.opexByCategory.find(
                  (p) => p.category === r.category,
                )?.amount ?? 0,
            })),
            {
              label: 'TOTAL OPEX',
              current: data.operatingExpenses.total,
              previous: data.previousPeriod.totalOpex,
              isTotal: true,
            },
            {
              label: 'NET PROFIT',
              current: data.netProfit,
              previous: data.previousPeriod.netProfit,
              isHighlight: true,
            },
            {
              label: 'NET MARGIN',
              current: data.netMargin,
              previous: data.previousPeriod.netMargin,
              isPercent: true,
            },
          ],
        },
      ]
    : [];

  const isEmpty = data && data.revenue.total === 0 && data.costOfServices.total === 0;

  return (
    <FeatureReadGate feature="finance.reports" featureName="Financial Reports">
    <div className="space-y-4">
      <nav className="text-sm text-cdy-muted">
        <Link href="/finance" className="hover:text-cdy-white">Finance</Link>
        <span className="mx-2">/</span>
        <Link href="/finance/reports" className="hover:text-cdy-white">Reports</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Profit & Loss</span>
      </nav>

      <ReportFilterBar
        presets={presets}
        activePreset={activePreset}
        from={from}
        to={to}
        onPresetChange={handlePreset}
        onCustomChange={(f, t) => {
          setActivePreset('custom');
          setFrom(f);
          setTo(t);
        }}
        onDownloadPdf={handleDownload}
        pdfLoading={pdfLoading}
      >
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className="h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
        >
          {SERVICE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </ReportFilterBar>

      {isLoading && <InvoiceTableSkeleton />}
      {isError && (
        <div className="rounded-lg border border-[var(--cdy-danger)]/30 bg-[var(--cdy-danger)]/10 px-4 py-3 text-sm text-[var(--cdy-danger)]">
          Failed to load report
        </div>
      )}
      {!isLoading && isEmpty && <EmptyReport />}
      {!isLoading && data && !isEmpty && <ReportTable sections={sections} />}
    </div>
    </FeatureReadGate>
  );
}
