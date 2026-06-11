'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Receipt,
  Building2,
  BarChart3,
  BadgeDollarSign,
  ShieldCheck,
  ClipboardList,
  GitMerge,
  RefreshCw,
  PiggyBank,
  Percent,
  Wallet,
  Settings2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@cdy/shared';
import { Role } from '@cdy/shared';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/finance',
    icon: LayoutDashboard,
    roles: [
      Role.CEO,
      Role.FINANCE_MANAGER,
      Role.SALES_AGENT,
      Role.PROJECT_MANAGER,
      Role.OPERATIONS_MANAGER,
      Role.TEAM_MEMBER,
    ],
  },
  {
    label: 'Invoices',
    href: '/finance/invoices',
    icon: FileText,
    roles: [Role.CEO, Role.FINANCE_MANAGER, Role.PROJECT_MANAGER],
  },
  {
    label: 'Payments',
    href: '/finance/payments',
    icon: CreditCard,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Expenses',
    href: '/finance/expenses',
    icon: Receipt,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Bills',
    href: '/finance/bills',
    icon: Building2,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'AR Ledger',
    href: '/finance/ar',
    icon: ClipboardList,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Reconciliation',
    href: '/finance/reconciliation',
    icon: GitMerge,
    roles: [Role.FINANCE_MANAGER],
  },
  {
    label: 'Retainers',
    href: '/finance/retainers',
    icon: RefreshCw,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Project Budget',
    href: '/finance/budget',
    icon: PiggyBank,
    roles: [
      Role.CEO,
      Role.FINANCE_MANAGER,
      Role.OPERATIONS_MANAGER,
      Role.PROJECT_MANAGER,
    ],
  },
  {
    label: 'Reports',
    href: '/finance/reports',
    icon: BarChart3,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Commissions',
    href: '/finance/commissions',
    icon: BadgeDollarSign,
    roles: [Role.CEO, Role.FINANCE_MANAGER, Role.SALES_AGENT],
  },
  {
    label: 'Payroll',
    href: '/finance/payroll',
    icon: Wallet,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Audit Log',
    href: '/finance/audit',
    icon: ShieldCheck,
    roles: [Role.CEO],
  },
  {
    label: 'Settings',
    href: '/finance/settings',
    icon: Settings2,
    roles: [Role.CEO, Role.FINANCE_MANAGER],
  },
  {
    label: 'Tax Rates',
    href: '/finance/settings/tax',
    icon: Percent,
    roles: [Role.FINANCE_MANAGER],
  },
];

interface FinanceSidebarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export function FinanceSidebar({ user, onLogout }: FinanceSidebarProps): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === '/finance/commissions' && user?.role === Role.SALES_AGENT) {
      return pathname.startsWith('/finance/commissions');
    }
    return href === '/finance'
      ? pathname === '/finance'
      : pathname.startsWith(href);
  }

  function resolveHref(item: NavItem): string {
    if (item.label === 'Commissions' && user?.role === Role.SALES_AGENT) {
      return '/finance/commissions/my';
    }
    return item.href;
  }

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  const navLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const href = resolveHref(item);
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={href}
            onClick={() => setMobileOpen(false)}
            title={item.label}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
              active
                ? 'border-l-2 border-cdy-red bg-cdy-red-light text-cdy-red'
                : 'border-l-2 border-transparent text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-lg:hidden max-md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-md bg-cdy-navy-light p-2 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-cdy-navy-light transition-transform md:static',
          'max-lg:w-10 max-lg:overflow-hidden',
          mobileOpen
            ? 'translate-x-0 max-md:w-60'
            : '-translate-x-full max-md:-translate-x-full md:translate-x-0 max-lg:translate-x-0',
        )}
      >
        <div className="border-b border-cdy-navy-border p-4 max-lg:hidden max-md:block">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cdy-red">CDY</span>
            <span className="text-xl font-semibold text-cdy-white">Finance</span>
          </div>
          <span className="mt-1 inline-block rounded-full border border-cdy-navy-border px-2 py-0.5 text-xs text-cdy-muted">
            v2.0
          </span>
        </div>

        {navLinks}

        <div className="border-t border-cdy-navy-border p-4 max-lg:hidden max-md:block">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-cdy-white">
                {user.firstName} {user.lastName}
              </p>
              <span className="mt-1 inline-block rounded-full border border-cdy-navy-border bg-cdy-navy px-2 py-0.5 text-xs text-cdy-muted">
                {user.role.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start gap-2 text-cdy-muted hover:text-cdy-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
