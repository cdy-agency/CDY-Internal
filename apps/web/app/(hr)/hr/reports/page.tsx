'use client';

import Link from 'next/link';
import { Users, UserMinus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reports = [
  {
    title: 'Headcount',
    description: 'Employee counts by department, status, and employment type',
    href: '/hr/reports/headcount',
    icon: Users,
    emoji: '👥',
  },
  {
    title: 'Turnover',
    description: 'New hires, terminations, and turnover rate analysis',
    href: '/hr/reports/turnover',
    icon: UserMinus,
    emoji: '📉',
  },
  {
    title: 'Leave Utilisation',
    description: 'Leave usage rates by type across the organisation',
    href: '/hr/reports/leave',
    icon: Calendar,
    emoji: '🏖️',
  },
  {
    title: 'Attendance Summary',
    description: 'Present, absent, and hours worked per employee',
    href: '/hr/reports/attendance',
    icon: Clock,
    emoji: '⏱️',
  },
];

export default function HrReportsLandingPage(): JSX.Element {
  return (
    <div className="space-y-8">
      <nav className="text-sm text-cdy-muted">
        <Link href="/hr" className="hover:text-cdy-white">
          HR
        </Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Reports</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">HR Reports</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.href}
            className="flex flex-col rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6"
          >
            <span className="text-3xl">{report.emoji}</span>
            <h2 className="mt-4 text-lg font-medium text-cdy-white">
              {report.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-cdy-muted">
              {report.description}
            </p>
            <Link href={report.href} className="mt-6">
              <Button className="w-full bg-cdy-red hover:bg-cdy-red/90">
                View Report
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
