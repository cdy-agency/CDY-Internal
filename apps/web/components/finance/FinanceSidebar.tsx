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
  Store,
  Landmark,
  Banknote,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@cdy/shared';
import { usePermissions } from '@/context/PermissionContext';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  feature: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/finance', icon: LayoutDashboard, feature: 'finance.dashboard' },
  { label: 'Invoices', href: '/finance/invoices', icon: FileText, feature: 'finance.invoices' },
  { label: 'Payments', href: '/finance/payments', icon: CreditCard, feature: 'finance.payments' },
  { label: 'Expenses', href: '/finance/expenses', icon: Receipt, feature: 'finance.expenses' },
  { label: 'Ventures', href: '/finance/ventures', icon: Store, feature: 'ventures.view' },
  { label: 'Bills', href: '/finance/bills', icon: Building2, feature: 'finance.bills' },
  { label: 'AR Ledger', href: '/finance/ar', icon: ClipboardList, feature: 'finance.ar' },
  {
    label: 'Reconciliation',
    href: '/finance/reconciliation',
    icon: GitMerge,
    feature: 'finance.reconciliation',
  },
  { label: 'Retainers', href: '/finance/retainers', icon: RefreshCw, feature: 'finance.retainers' },
  { label: 'Project Budget', href: '/finance/budget', icon: PiggyBank, feature: 'finance.budget' },
  { label: 'Reserve Fund', href: '/finance/reserve', icon: Landmark, feature: 'finance.reserve' },
  { label: 'Reports', href: '/finance/reports', icon: BarChart3, feature: 'finance.reports' },
  {
    label: 'Commissions',
    href: '/finance/commissions',
    icon: BadgeDollarSign,
    feature: 'finance.commissions',
  },
  {
    label: 'My Commissions',
    href: '/finance/commissions/my',
    icon: BadgeDollarSign,
    feature: 'finance.commissions.own',
  },
  { label: 'Payroll', href: '/finance/payroll', icon: Wallet, feature: 'finance.payroll' },
  { label: 'Audit Log', href: '/finance/audit', icon: ShieldCheck, feature: 'finance.audit' },
  { label: 'Settings', href: '/finance/settings', icon: Settings2, feature: 'finance.settings' },
  {
    label: 'Tax Rates',
    href: '/finance/settings/tax',
    icon: Percent,
    feature: 'finance.tax',
  },
  {
    label: 'Company Accounts',
    href: '/finance/settings/accounts',
    icon: Banknote,
    feature: 'finance.accounts',
  },
];

interface FinanceSidebarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export function FinanceSidebar({ user, onLogout }: FinanceSidebarProps): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canRead } = usePermissions();

  function isActive(href: string): boolean {
    return href === '/finance'
      ? pathname === '/finance'
      : pathname.startsWith(href);
  }

  const visibleItems = navItems.filter((item) => canRead(item.feature));

  const navLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const href = item.href;
        const active = isActive(href);
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
                {user.roleName}
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
