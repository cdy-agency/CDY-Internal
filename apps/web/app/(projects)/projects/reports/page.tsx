'use client';

import Link from 'next/link';
import { BarChart3, DollarSign } from 'lucide-react';

const REPORT_CARDS = [
  {
    title: 'Portfolio Overview',
    description:
      'All projects health, revenue potential, and service breakdown',
    href: '/projects/reports/portfolio',
    icon: BarChart3,
    emoji: '📊',
  },
  {
    title: 'Budget vs Actual',
    description: 'Approved budget vs actual spend across all active projects',
    href: '/projects/reports/budget',
    icon: DollarSign,
    emoji: '💰',
  },
] as const;

export default function ProjectReportsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cdy-white">Reports</h1>
        <p className="text-sm text-cdy-muted">
          Portfolio analytics and budget tracking across all projects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.href}
              className="flex flex-col rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">{card.emoji}</span>
                <Icon className="h-5 w-5 text-cdy-red" />
                <h2 className="text-lg font-semibold text-cdy-white">
                  {card.title}
                </h2>
              </div>
              <p className="mb-6 flex-1 text-sm text-cdy-muted">
                {card.description}
              </p>
              <Link
                href={card.href}
                className="inline-flex w-fit rounded-md bg-cdy-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cdy-red/90"
              >
                View Report
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
