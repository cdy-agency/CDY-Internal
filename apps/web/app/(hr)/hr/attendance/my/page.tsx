'use client';

import { useState } from 'react';
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import toast from 'react-hot-toast';
import { AttendanceStatus } from '@cdy/shared';
import {
  useMyAttendance,
  useCheckIn,
  useCheckOut,
  currentMonthParam,
} from '@/hooks/useHr';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function statusColor(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    [AttendanceStatus.PRESENT]: 'bg-emerald-500/60',
    [AttendanceStatus.ABSENT]: 'bg-cdy-red/60',
    [AttendanceStatus.HALF_DAY]: 'bg-amber-500/60',
    [AttendanceStatus.ON_LEAVE]: 'bg-blue-500/60',
    [AttendanceStatus.PUBLIC_HOLIDAY]: 'bg-purple-500/40',
    [AttendanceStatus.WEEKEND]: 'bg-cdy-navy-light',
  };
  return map[status] ?? 'bg-cdy-navy-light';
}

export default function MyAttendancePage(): JSX.Element {
  const [month, setMonth] = useState(currentMonthParam());
  const { data, isLoading, refetch } = useMyAttendance(month);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const today = data?.today;
  const report = data?.report;
  const isCurrentMonth = month === currentMonthParam();

  const monthDate = new Date(`${month}-01`);
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });
  const startPad = getDay(startOfMonth(monthDate));

  const recordByDate = new Map(
    report?.records.map((r) => [
      format(new Date(r.date), 'yyyy-MM-dd'),
      r,
    ]) ?? [],
  );

  async function handleCheckIn(): Promise<void> {
    try {
      await checkIn.mutateAsync();
      toast.success('Checked in');
      void refetch();
    } catch {
      /* interceptor */
    }
  }

  async function handleCheckOut(): Promise<void> {
    try {
      await checkOut.mutateAsync();
      toast.success('Checked out');
      void refetch();
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-cdy-white">My Attendance</h2>

      {isCurrentMonth && (
        <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
          <h3 className="mb-4 font-semibold text-cdy-white">Today</h3>
          <div className="flex flex-wrap items-center gap-4">
            {today?.checkInAt ? (
              <p className="text-sm text-cdy-muted">
                Checked in at{' '}
                {format(new Date(today.checkInAt), 'HH:mm')}
                {today.checkOutAt &&
                  ` · Out at ${format(new Date(today.checkOutAt), 'HH:mm')}`}
                {today.workingHours != null &&
                  ` · ${Number(today.workingHours).toFixed(1)} hrs`}
              </p>
            ) : (
              <p className="text-sm text-cdy-muted">Not checked in yet.</p>
            )}
            <div className="flex gap-2">
              <Button
                disabled={Boolean(today?.checkInAt) || checkIn.isPending}
                onClick={() => void handleCheckIn()}
              >
                Check In
              </Button>
              <Button
                variant="outline"
                disabled={
                  !today?.checkInAt ||
                  Boolean(today?.checkOutAt) ||
                  checkOut.isPending
                }
                onClick={() => void handleCheckOut()}
              >
                Check Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))
          }
        >
          ←
        </Button>
        <span className="text-sm text-cdy-white">
          {format(monthDate, 'MMMM yyyy')}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={isCurrentMonth}
          onClick={() =>
            setMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))
          }
        >
          →
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-cdy-muted">Loading…</p>
      ) : (
        <>
          {report && (
            <div className="flex flex-wrap gap-4 text-sm text-cdy-muted">
              <span>{report.summary.present} present</span>
              <span>{report.summary.absent} absent</span>
              <span>{report.summary.halfDay} half day</span>
              <span>{report.summary.onLeave} on leave</span>
              <span>{report.summary.totalHours.toFixed(1)} total hrs</span>
            </div>
          )}

          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-4">
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-cdy-muted">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const record = recordByDate.get(key);
                return (
                  <div
                    key={key}
                    title={
                      record
                        ? `${format(day, 'MMM d')}: ${record.status}`
                        : format(day, 'MMM d')
                    }
                    className={cn(
                      'flex aspect-square flex-col items-center justify-center rounded-sm text-[10px]',
                      record
                        ? statusColor(record.status)
                        : 'border border-cdy-navy-border bg-cdy-navy',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
