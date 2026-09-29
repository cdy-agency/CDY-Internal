'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Palette, LogOut, Menu, X } from 'lucide-react';
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
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/branding',
    icon: LayoutDashboard,
    feature: 'branding.projects',
    exact: true,
  },
  {
    label: 'Projects',
    href: '/branding',
    icon: Palette,
    feature: 'branding.projects',
    exact: false,
  },
];

interface BrandingSidebarProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export function BrandingSidebar({
  user,
  onLogout,
}: BrandingSidebarProps): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canRead } = usePermissions();

  function isActive(item: NavItem): boolean {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const visibleItems = navItems.filter((item) => canRead(item.feature));

  const navLinks = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.label}
            href={item.href}
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
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 rounded-md bg-cdy-navy-light p-2 text-cdy-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col bg-cdy-navy-light transition-transform lg:static lg:translate-x-0',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full',
        )}
      >
        <div className="border-b border-cdy-navy-border p-4 pl-16 lg:pl-4">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cdy-red">CDY</span>
            <span className="text-xl font-semibold text-cdy-white">Branding</span>
          </div>
          <span className="mt-1 inline-block rounded-full border border-cdy-navy-border px-2 py-0.5 text-xs text-cdy-muted">
            v1.0
          </span>
        </div>

        {navLinks}

        <div className="border-t border-cdy-navy-border p-4">
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
