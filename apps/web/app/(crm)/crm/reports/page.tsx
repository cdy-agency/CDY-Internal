'use client';

import Link from 'next/link';
import { BarChart3, Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reports = [
  {
    title: 'Conversion Funnel',
    description: 'Lead-to-client conversion tracking',
    href: '/crm/reports/conversion',
    icon: BarChart3,
    emoji: '📊',
  },
  {
    title: 'Sales Performance',
    description: 'Agent-level deep dive vs monthly targets',
    href: '/crm/reports/sales-performance',
    icon: TrendingUp,
    emoji: '👤',
  },
  {
    title: 'Source Analysis',
    description: 'Which channels drive the best ROI',
    href: '/crm/reports/source-analysis',
    icon: Search,
    emoji: '🔍',
  },
];

export default function CrmReportsLandingPage(): JSX.Element {
  return (
    <div className="space-y-8">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">
          CRM
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Reports</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">CRM Reports</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.href}
            className="flex flex-col rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6"
          >
            <span className="text-3xl">{report.emoji}</span>
            <h2 className="mt-4 text-lg font-medium text-cdy-white">{report.title}</h2>
            <p className="mt-2 flex-1 text-sm text-cdy-muted">{report.description}</p>
            <Link href={report.href} className="mt-6">
              <Button className="w-full bg-cdy-red hover:bg-cdy-red/90">View Report</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
