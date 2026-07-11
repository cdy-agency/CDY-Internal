'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  UserSearch,
  Building2,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  Settings2,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@cdy/shared';
import { usePermissions } from '@/context/PermissionContext';

const navItems = [
  { label: 'Overview', href: '/crm', icon: LayoutDashboard, feature: 'crm.pipeline' },
  { label: 'Pipeline', href: '/crm/pipeline', icon: Kanban, feature: 'crm.pipeline' },
  { label: 'Leads', href: '/crm/leads', icon: UserSearch, feature: 'crm.leads' },
  { label: 'Proposals', href: '/crm/proposals', icon: FileText, feature: 'crm.proposals' },
  { label: 'Clients', href: '/crm/clients', icon: Building2, feature: 'crm.clients' },
  { label: 'Reports', href: '/crm/reports', icon: BarChart3, feature: 'crm.reports' },
];

const bottomNavItems = [
  { label: 'Settings', href: '/crm/settings', icon: Settings2, feature: 'crm.reports' },
  {
    label: 'Audit Log',
    href: '/crm/audit',
    icon: ClipboardList,
    feature: 'crm.reports',
  },
];

interface CrmSidebarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export function CrmSidebar({ user, onLogout }: CrmSidebarProps): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canRead } = usePermissions();

  const visibleItems = navItems.filter((item) => canRead(item.feature));

  const visibleBottomItems = bottomNavItems.filter((item) =>
    canRead(item.feature),
  );

  function isActive(href: string): boolean {
    return href === '/crm' ? pathname === '/crm' : pathname.startsWith(href);
  }

  const sidebar = (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-cdy-navy-border bg-cdy-navy">
      <div className="border-b border-cdy-navy-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cdy-red">
          CDY
        </p>
        <p className="text-lg font-bold text-cdy-white">CRM</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-cdy-red/15 text-cdy-red'
                  : 'text-cdy-muted hover:bg-cdy-navy-light hover:text-cdy-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {visibleBottomItems.length > 0 && (
          <div className="mt-4 border-t border-cdy-navy-border pt-4">
            {visibleBottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-cdy-red/15 text-cdy-red'
                      : 'text-cdy-muted hover:bg-cdy-navy-light hover:text-cdy-white',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <div className="border-t border-cdy-navy-border p-4">
        {user && (
          <p className="mb-3 truncate text-sm text-cdy-muted">
            {user.firstName} {user.lastName}
          </p>
        )}
        <Button variant="outline" className="w-full" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-md bg-cdy-navy-light p-2 text-cdy-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </div>
    </>
  );
}
