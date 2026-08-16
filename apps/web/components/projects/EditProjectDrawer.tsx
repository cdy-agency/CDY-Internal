'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectPriority, type ClientSearchResult, type ProjectRecord } from '@cdy/shared';
import {
  useUpdateProject,
  useAddProjectMember,
  useRemoveProjectMember,
} from '@/hooks/useProjects';
import { useEmployeeLookup } from '@/hooks/useHr';
import { ClientSearch } from '@/components/crm/ClientSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SERVICE_TYPES = [
  { value: 'software_dev', label: 'Software Development' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'branding', label: 'Branding' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: Array<{ value: ProjectPriority; label: string }> = [
  { value: ProjectPriority.LOW, label: 'Low' },
  { value: ProjectPriority.MEDIUM, label: 'Medium' },
  { value: ProjectPriority.HIGH, label: 'High' },
  { value: ProjectPriority.URGENT, label: 'Urgent' },
];

const CURRENCIES = ['RWF', 'USD', 'EUR', 'GBP'];

interface EditProjectDrawerProps {
  open: boolean;
  project: ProjectRecord | null;
  onClose: () => void;
}

export function EditProjectDrawer({
  open,
  project,
  onClose,
}: EditProjectDrawerProps): JSX.Element | null {
  const updateProject = useUpdateProject();
  const addMembers = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const { data: employees } = useEmployeeLookup();

  const [client, setClient] = useState<ClientSearchResult | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    serviceType: 'software_dev',
    priority: ProjectPriority.MEDIUM,
    startDate: '',
    endDate: '',
    totalCost: '',
    currency: 'RWF',
    managerId: '',
    notes: '',
  });
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [initialMemberIds, setInitialMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && project) {
      setClient(
        project.clientId
          ? {
              id: project.clientId,
              companyName: project.client?.companyName ?? '',
              contactName: project.client?.contactName ?? '',
              email: '',
              country: '',
            }
          : null,
      );
      setForm({
        name: project.name,
        description: project.description ?? '',
        serviceType: project.serviceType,
        priority: project.priority,
        startDate: project.startDate.slice(0, 10),
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
        totalCost: project.totalCost != null ? String(project.totalCost) : '',
        currency: project.currency,
        managerId: project.managerId,
        notes: project.notes ?? '',
      });
      const currentMembers = (project.members ?? []).map((m) => m.employeeId);
      setMemberIds(currentMembers);
      setInitialMemberIds(currentMembers);
    }
  }, [open, project]);

  if (!open || !project) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMember(employeeId: string): void {
    setMemberIds((ids) =>
      ids.includes(employeeId)
        ? ids.filter((id) => id !== employeeId)
        : [...ids, employeeId],
    );
  }

  async function handleSubmit(): Promise<void> {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!form.managerId) {
      toast.error('Project manager is required');
      return;
    }
    if (!form.startDate) {
      toast.error('Start date is required');
      return;
    }

    setSaving(true);
    try {
      await updateProject.mutateAsync({
        id: project!.id,
        payload: {
          name: form.name,
          description: form.description || undefined,
          clientId: client?.id ?? null,
          serviceType: form.serviceType,
          priority: form.priority,
          managerId: form.managerId,
          startDate: form.startDate,
          endDate: form.endDate || null,
          totalCost: form.totalCost ? Number(form.totalCost) : null,
          currency: form.currency,
          notes: form.notes || null,
        },
      });

      const toAdd = memberIds.filter((id) => !initialMemberIds.includes(id));
      const toRemove = initialMemberIds.filter((id) => !memberIds.includes(id));

      if (toAdd.length > 0) {
        await addMembers.mutateAsync({ projectId: project!.id, employeeIds: toAdd });
      }
      for (const employeeId of toRemove) {
        await removeMember.mutateAsync({ projectId: project!.id, employeeId });
      }

      toast.success('Project updated');
      onClose();
    } catch {
      /* interceptor */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col bg-cdy-navy shadow-xl">
        <div className="flex items-center justify-between border-b border-cdy-navy-border px-5 py-4">
          <h2 className="text-lg font-semibold text-cdy-white">Edit Project</h2>
          <button type="button" onClick={onClose} className="text-cdy-muted hover:text-cdy-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <Label className="text-cdy-muted">Project name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-cdy-muted">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted"
            />
          </div>

          <div>
            <Label className="text-cdy-muted">Client</Label>
            <ClientSearch value={client} onChange={setClient} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Service type *</Label>
              <select
                value={form.serviceType}
                onChange={(e) => set('serviceType', e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-cdy-muted">Priority *</Label>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as ProjectPriority)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Start date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">End date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cdy-muted">Total agreed cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.totalCost}
                onChange={(e) => set('totalCost', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-cdy-muted">Currency</Label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-cdy-muted">Project manager *</Label>
            <select
              value={form.managerId}
              onChange={(e) => set('managerId', e.target.value)}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
            >
              <option value="">Select manager…</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} — {emp.jobTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-cdy-muted">Team members</Label>
            <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-md border border-cdy-navy-border p-2">
              {employees?.map((emp) => (
                <label
                  key={emp.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-cdy-navy-light"
                >
                  <input
                    type="checkbox"
                    checked={memberIds.includes(emp.id)}
                    onChange={() => toggleMember(emp.id)}
                    className="rounded border-cdy-navy-border"
                  />
                  <span className="text-sm text-cdy-white">
                    {emp.firstName} {emp.lastName}
                  </span>
                  <span className="text-xs text-cdy-muted">{emp.jobTitle}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-cdy-muted">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-cdy-navy-border px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
