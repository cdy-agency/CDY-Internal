'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Bell, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { ModuleSwitcher } from '@/components/layout/ModuleSwitcher';
import { usePermissions } from '@/context/PermissionContext';

interface FinanceTopbarProps {
  title: string;
  breadcrumb?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function FinanceTopbar({
  title,
  breadcrumb = 'Finance',
  actionLabel,
  onAction,
}: FinanceTopbarProps): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { roleKey } = usePermissions();

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-cdy-navy-border bg-cdy-navy px-6 py-4">
        <div>
          <div className="mb-1 flex items-center gap-1 text-sm text-cdy-muted">
            <span>{breadcrumb}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-cdy-white">{title}</span>
          </div>
          <h1 className="text-xl font-semibold text-cdy-white">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {roleKey === 'CEO' && (
            <Link
              href="/ceo"
              className="flex items-center gap-1.5 rounded-lg bg-cdy-red px-3 py-1.5 text-sm font-medium text-white hover:bg-cdy-red/90 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              CEO Dashboard
            </Link>
          )}
          <ModuleSwitcher />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative rounded-md p-2 text-cdy-muted transition-colors hover:bg-cdy-navy-light hover:text-cdy-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cdy-red px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {actionLabel && onAction && (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      </header>
      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
