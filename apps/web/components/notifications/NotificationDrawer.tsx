'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Bell, Trash2, X } from 'lucide-react';
import { NotificationType, type NotificationRecord } from '@cdy/shared';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  const deleteNotification = useDeleteNotification();
  const [deleteTarget, setDeleteTarget] = useState<NotificationRecord | null>(null);

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

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await deleteNotification.mutateAsync(deleteTarget.id);
      toast.success('Notification deleted');
      setDeleteTarget(null);
    } catch {
      /* interceptor */
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
              <div
                key={notification.id}
                className={cn(
                  'flex items-stretch border-b border-cdy-navy-border transition-colors hover:bg-cdy-navy',
                  unread && 'border-l-2 border-l-cdy-red bg-cdy-navy-light',
                )}
              >
                <button
                  type="button"
                  onClick={() => void handleClick(notification)}
                  className="flex-1 px-4 py-4 text-left"
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
                <button
                  type="button"
                  onClick={() => setDeleteTarget(notification)}
                  className="px-3 text-cdy-muted hover:text-cdy-red"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete notification?"
        description="This action can be undone by an admin, but the record will be hidden immediately."
        isLoading={deleteNotification.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
