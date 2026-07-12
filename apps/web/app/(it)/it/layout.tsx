'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import api from '@/lib/api';
import { redirectToLoginAfterAuthFailure } from '@/lib/session';
import { hasModuleAccess } from '@/lib/module-access';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ApiResponse, UserProfile } from '@cdy/shared';

const navItems = [
  { label: 'Overview', href: '/it', icon: LayoutDashboard },
  { label: 'Users', href: '/it/users', icon: Users },
  { label: 'Roles', href: '/it/roles', icon: Shield },
  { label: 'Audit Log', href: '/it/audit', icon: ClipboardList },
];

export default function ItLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<UserProfile>>('/auth/me')
      .then((res) => {
        const profile = res.data.data;
        // Feature-based gate: access requires an it.* permission (any role
        // granted IT features qualifies), not a hardcoded role key.
        if (!hasModuleAccess(profile.permissions, 'it')) {
          router.push('/403');
          return;
        }
        setUser(profile);
      })
      .catch(() => void redirectToLoginAfterAuthFailure(router));
  }, [router]);

  function handleLogout(): void {
    router.push('/login');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cdy-navy">
      <aside className="flex w-60 flex-col bg-cdy-navy-light">
        <div className="border-b border-cdy-navy-border p-4">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-cdy-red">CDY</span>
            <span className="text-xl font-semibold text-cdy-white">IT Admin</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/it'
                ? pathname === '/it'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'border-l-2 border-cdy-red bg-cdy-red-light text-cdy-red'
                    : 'border-l-2 border-transparent text-cdy-muted hover:bg-cdy-navy hover:text-cdy-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-cdy-navy-border p-4">
          {user && (
            <p className="mb-3 text-sm text-cdy-white">
              {user.firstName} {user.lastName}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-cdy-muted"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
