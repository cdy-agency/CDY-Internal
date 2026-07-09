'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { LeaveTypeRecord } from '@cdy/shared';
import {
  useHrSettings,
  useUpdateHrSetting,
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
} from '@/hooks/useHr';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'leave-types';

const WORKING_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function HrSettingsPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('general');
  const { data: settings, isLoading } = useHrSettings();
  const updateSetting = useUpdateHrSetting();
  const { data: leaveTypes } = useLeaveTypes();
  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();
  const queryClient = useQueryClient();
  const [deleteLeaveType, setDeleteLeaveType] = useState<LeaveTypeRecord | null>(null);
  const [isDeletingLeaveType, setIsDeletingLeaveType] = useState(false);

  const [form, setForm] = useState({
    working_hours_per_day: '8',
    leave_year_start: '01-01',
    carry_over_max_days: '5',
    probation_days: '90',
    workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as string[],
  });

  const [newLeaveType, setNewLeaveType] = useState({
    name: '',
    code: '',
    defaultDaysPerYear: '0',
    isPaid: true,
    requiresApproval: true,
    requiresDocument: false,
  });

  useEffect(() => {
    if (settings) {
      let workingDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      try {
        const parsed = JSON.parse(settings.working_days ?? '[]') as string[];
        if (Array.isArray(parsed)) workingDays = parsed;
      } catch {
        /* keep default */
      }
      setForm({
        working_hours_per_day:
          settings.working_hours_per_day ?? form.working_hours_per_day,
        leave_year_start: settings.leave_year_start ?? form.leave_year_start,
        carry_over_max_days:
          settings.carry_over_max_days ?? form.carry_over_max_days,
        probation_days: settings.probation_days ?? form.probation_days,
        workingDays,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  async function saveGeneral(): Promise<void> {
    try {
      await updateSetting.mutateAsync({
        key: 'working_days',
        value: JSON.stringify(form.workingDays),
      });
      await updateSetting.mutateAsync({
        key: 'working_hours_per_day',
        value: form.working_hours_per_day,
      });
      await updateSetting.mutateAsync({
        key: 'leave_year_start',
        value: form.leave_year_start,
      });
      await updateSetting.mutateAsync({
        key: 'carry_over_max_days',
        value: form.carry_over_max_days,
      });
      await updateSetting.mutateAsync({
        key: 'probation_days',
        value: form.probation_days,
      });
      toast.success('Settings saved');
    } catch {
      /* interceptor */
    }
  }

  function toggleWorkingDay(day: string): void {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  }

  async function handleCreateLeaveType(): Promise<void> {
    if (!newLeaveType.name || !newLeaveType.code) {
      toast.error('Name and code are required');
      return;
    }
    try {
      await createLeaveType.mutateAsync({
        name: newLeaveType.name,
        code: newLeaveType.code.toUpperCase(),
        defaultDaysPerYear: Number(newLeaveType.defaultDaysPerYear),
        isPaid: newLeaveType.isPaid,
        requiresApproval: newLeaveType.requiresApproval,
        requiresDocument: newLeaveType.requiresDocument,
      });
      toast.success('Leave type created');
      setNewLeaveType({
        name: '',
        code: '',
        defaultDaysPerYear: '0',
        isPaid: true,
        requiresApproval: true,
        requiresDocument: false,
      });
    } catch {
      /* interceptor */
    }
  }

  async function handleDeleteLeaveType(): Promise<void> {
    if (!deleteLeaveType) return;
    setIsDeletingLeaveType(true);
    try {
      await api.delete(`/hr/leave-types/${deleteLeaveType.id}`);
      toast.success('Leave type deleted');
      void queryClient.invalidateQueries({ queryKey: ['hr', 'leave-types'] });
      setDeleteLeaveType(null);
    } catch {
      /* interceptor already toasts */
    } finally {
      setIsDeletingLeaveType(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold text-cdy-white">HR Settings</h2>

      <div className="flex gap-1 border-b border-cdy-navy-border">
        {(['general', 'leave-types'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-cdy-red text-cdy-red'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <PermissionGate feature="hr.settings" action="read">
          <div className="space-y-6 rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
            {isLoading ? (
              <p className="text-sm text-cdy-muted">Loading…</p>
            ) : (
              <>
                <div>
                  <Label>Working days</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WORKING_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={cn(
                          'rounded-md px-3 py-1 text-sm transition-colors',
                          form.workingDays.includes(day)
                            ? 'bg-cdy-red text-white'
                            : 'border border-cdy-navy-border text-cdy-muted hover:text-cdy-white',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="working_hours_per_day">
                      Working hours per day
                    </Label>
                    <Input
                      id="working_hours_per_day"
                      type="number"
                      min="1"
                      max="24"
                      value={form.working_hours_per_day}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          working_hours_per_day: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="leave_year_start">
                      Leave year start (MM-DD)
                    </Label>
                    <Input
                      id="leave_year_start"
                      placeholder="01-01"
                      value={form.leave_year_start}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          leave_year_start: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="carry_over_max_days">
                      Max carry-over days
                    </Label>
                    <Input
                      id="carry_over_max_days"
                      type="number"
                      min="0"
                      value={form.carry_over_max_days}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          carry_over_max_days: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="probation_days">Probation period (days)</Label>
                    <Input
                      id="probation_days"
                      type="number"
                      min="0"
                      value={form.probation_days}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          probation_days: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <PermissionGate feature="hr.settings" action="write">
                  <Button
                    onClick={() => void saveGeneral()}
                    disabled={updateSetting.isPending}
                  >
                    Save Settings
                  </Button>
                </PermissionGate>
              </>
            )}
          </div>
        </PermissionGate>
      )}

      {tab === 'leave-types' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
            <h3 className="mb-4 font-semibold text-cdy-white">
              Active Leave Types
            </h3>
            {(leaveTypes?.length ?? 0) === 0 ? (
              <p className="text-sm text-cdy-muted">No leave types configured.</p>
            ) : (
              <div className="space-y-3">
                {leaveTypes?.map((lt) => (
                  <div
                    key={lt.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cdy-navy-border bg-cdy-navy p-3"
                  >
                    <div>
                      <p className="font-medium text-cdy-white">
                        {lt.name}{' '}
                        <span className="text-xs text-cdy-muted">({lt.code})</span>
                      </p>
                      <p className="text-xs text-cdy-muted">
                        {lt.defaultDaysPerYear} days/year ·{' '}
                        {lt.isPaid ? 'Paid' : 'Unpaid'}
                        {lt.requiresApproval && ' · Requires approval'}
                      </p>
                    </div>
                    <PermissionGate feature="hr.settings" action="write">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateLeaveType.isPending}
                          onClick={() =>
                            void updateLeaveType.mutateAsync({
                              id: lt.id,
                              payload: { isActive: false },
                            })
                          }
                        >
                          Deactivate
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteLeaveType(lt)}
                          className="text-cdy-muted hover:text-cdy-red"
                          aria-label="Delete leave type"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PermissionGate feature="hr.settings" action="write">
            <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-5">
              <h3 className="mb-4 font-semibold text-cdy-white">
                Add Leave Type
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ltName">Name</Label>
                  <Input
                    id="ltName"
                    value={newLeaveType.name}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ltCode">Code</Label>
                  <Input
                    id="ltCode"
                    value={newLeaveType.code}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({ ...f, code: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="ltDays">Default days per year</Label>
                  <Input
                    id="ltDays"
                    type="number"
                    min="0"
                    value={newLeaveType.defaultDaysPerYear}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({
                        ...f,
                        defaultDaysPerYear: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 text-cdy-muted">
                  <input
                    type="checkbox"
                    checked={newLeaveType.isPaid}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({
                        ...f,
                        isPaid: e.target.checked,
                      }))
                    }
                  />
                  Paid
                </label>
                <label className="flex items-center gap-2 text-cdy-muted">
                  <input
                    type="checkbox"
                    checked={newLeaveType.requiresApproval}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({
                        ...f,
                        requiresApproval: e.target.checked,
                      }))
                    }
                  />
                  Requires approval
                </label>
                <label className="flex items-center gap-2 text-cdy-muted">
                  <input
                    type="checkbox"
                    checked={newLeaveType.requiresDocument}
                    onChange={(e) =>
                      setNewLeaveType((f) => ({
                        ...f,
                        requiresDocument: e.target.checked,
                      }))
                    }
                  />
                  Requires document
                </label>
              </div>
              <Button
                className="mt-4"
                disabled={createLeaveType.isPending}
                onClick={() => void handleCreateLeaveType()}
              >
                Create Leave Type
              </Button>
            </div>
          </PermissionGate>
        </div>
      )}

      <ConfirmDialog
        open={deleteLeaveType !== null}
        title="Delete leave type?"
        description={
          deleteLeaveType
            ? `This will remove "${deleteLeaveType.name}" (${deleteLeaveType.code}).`
            : undefined
        }
        confirmLabel="Delete"
        isLoading={isDeletingLeaveType}
        onConfirm={() => void handleDeleteLeaveType()}
        onCancel={() => setDeleteLeaveType(null)}
      />
    </div>
  );
}
