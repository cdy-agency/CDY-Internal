'use client';

import { format, parseISO } from 'date-fns';
import { ActivityEventType } from '@cdy/shared';
import { useProjectActivity } from '@/hooks/useProjects';

const EVENT_ICONS: Partial<Record<ActivityEventType, string>> = {
  [ActivityEventType.APPROVAL_REQUESTED]: '📤',
  [ActivityEventType.APPROVAL_GIVEN]: '✅',
  [ActivityEventType.APPROVAL_REJECTED]: '❌',
  [ActivityEventType.TASK_STATUS_CHANGED]: '🔄',
  [ActivityEventType.TASK_CREATED]: '➕',
  [ActivityEventType.TASK_ASSIGNED]: '👤',
  [ActivityEventType.TASK_COMMENTED]: '💬',
  [ActivityEventType.MILESTONE_CREATED]: '📋',
  [ActivityEventType.MILESTONE_COMPLETED]: '✔️',
  [ActivityEventType.MEMBER_ADDED]: '➕',
  [ActivityEventType.MEMBER_REMOVED]: '➖',
  [ActivityEventType.PROJECT_CREATED]: '🚀',
  [ActivityEventType.PROJECT_STATUS_CHANGED]: '📊',
};

interface ProjectActivityPanelProps {
  projectId: string;
}

export function ProjectActivityPanel({
  projectId,
}: ProjectActivityPanelProps): JSX.Element {
  const { data: events, isLoading } = useProjectActivity(projectId);

  return (
    <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
      <h2 className="mb-4 text-lg font-semibold text-cdy-white">
        Activity Feed
      </h2>
      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (events?.length ?? 0) === 0 ? (
        <p className="text-sm text-cdy-muted">No activity recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {events?.map((event) => (
            <div
              key={event.id}
              className="border-b border-cdy-navy-border/50 pb-4 last:border-0"
            >
              <p className="text-xs text-cdy-muted">
                {format(parseISO(event.createdAt), 'MMM d, yyyy — h:mm a')}
              </p>
              <p className="mt-1 text-sm text-cdy-white">
                <span className="mr-2">
                  {EVENT_ICONS[event.type] ?? '•'}
                </span>
                {event.summary}
              </p>
              <p className="mt-1 text-xs text-cdy-muted">
                By: {event.userName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
