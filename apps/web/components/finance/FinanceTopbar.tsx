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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cdy-navy-border bg-cdy-navy px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1 text-sm text-cdy-muted truncate">
            <span className="truncate">{breadcrumb}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-cdy-white truncate">{title}</span>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-cdy-white truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ModuleSwitcher />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative rounded-md p-2 text-cdy-muted transition-colors hover:bg-cdy-navy-light hover:text-cdy-white"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-cdy-red px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {actionLabel && onAction && (
            <Button onClick={onAction} className="whitespace-nowrap">{actionLabel}</Button>
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
