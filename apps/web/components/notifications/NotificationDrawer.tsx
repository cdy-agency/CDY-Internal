'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bell, X } from 'lucide-react';
import { NotificationType, type NotificationRecord } from '@cdy/shared';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function notificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.INVOICE_OVERDUE:
      return '🔴';
    case NotificationType.PAYMENT_RECEIVED:
      return '💰';
    case NotificationType.COMMISSION_APPROVED:
      return '✅';
    case NotificationType.COMMISSION_REJECTED:
      return '❌';
    case NotificationType.BILL_DUE_SOON:
    case NotificationType.BILL_OVERDUE:
      return '⚠️';
    case NotificationType.INVOICE_REMINDER_SENT:
    case NotificationType.REMINDER_FAILED:
      return '📧';
    default:
      return '🔔';
  }
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDrawer({
  open,
  onClose,
}: NotificationDrawerProps): JSX.Element | null {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleClick(notification: NotificationRecord): Promise<void> {
    if (!notification.readAt) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.link) {
      onClose();
      router.push(notification.link);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        role="presentation"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-4 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={!data?.unreadCount}
            >
              Mark all read
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-cdy-muted hover:text-cdy-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="p-6 text-center text-sm text-cdy-muted">Loading...</p>
          )}
          {!isLoading && data?.notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <Bell className="h-10 w-10 text-cdy-muted" />
              <p className="text-cdy-muted">You&apos;re all caught up</p>
            </div>
          )}
          {data?.notifications.map((notification) => {
            const unread = !notification.readAt;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleClick(notification)}
                className={cn(
                  'w-full border-b border-cdy-navy-border px-4 py-4 text-left transition-colors hover:bg-cdy-navy',
                  unread && 'border-l-2 border-l-cdy-red bg-cdy-navy-light',
                )}
              >
                <div className="flex gap-3">
                  <span className="text-lg">
                    {notificationIcon(notification.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-cdy-white">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-cdy-muted">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-cdy-muted">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
