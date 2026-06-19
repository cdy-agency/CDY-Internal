'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ProjectPriority } from '@cdy/shared';
import type { ClientSearchResult } from '@cdy/shared';
import {
  useCreateProject,
  useCreateMilestone,
} from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useHr';
import { ClientSearch } from '@/components/crm/ClientSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';

type Tab = 'info' | 'timeline' | 'team' | 'milestones';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'info', label: 'Project Info' },
  { id: 'timeline', label: 'Timeline & Budget' },
  { id: 'team', label: 'Team' },
  { id: 'milestones', label: 'Milestones' },
];

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

interface DraftMilestone {
  name: string;
  billingAmount: string;
  dueDate: string;
}

export default function NewProjectPage(): JSX.Element {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const createProject = useCreateProject();
  const createMilestone = useCreateMilestone();
  const { data: employees } = useEmployees();

  const [client, setClient] = useState<ClientSearchResult | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    serviceType: 'software_dev',
    priority: ProjectPriority.MEDIUM,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    estimatedBudget: '',
    currency: 'USD',
    managerId: '',
    memberIds: [] as string[],
    notes: '',
  });
  const [milestones, setMilestones] = useState<DraftMilestone[]>([]);

  const milestoneTotal = milestones.reduce(
    (sum, m) => sum + (Number(m.billingAmount) || 0),
    0,
  );
  const estimatedBudget = Number(form.estimatedBudget) || 0;
  const remaining = estimatedBudget - milestoneTotal;

  function toggleMember(employeeId: string): void {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(employeeId)
        ? f.memberIds.filter((id) => id !== employeeId)
        : [...f.memberIds, employeeId],
    }));
  }

  function addMilestone(): void {
    setMilestones((m) => [
      ...m,
      { name: '', billingAmount: '', dueDate: '' },
    ]);
  }

  function updateMilestone(
    index: number,
    field: keyof DraftMilestone,
    value: string,
  ): void {
    setMilestones((m) =>
      m.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeMilestone(index: number): void {
    setMilestones((m) => m.filter((_, i) => i !== index));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.name || !form.serviceType || !form.managerId || !form.startDate) {
      toast.error('Please complete all required fields');
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        clientId: client?.id,
        serviceType: form.serviceType,
        priority: form.priority,
        managerId: form.managerId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        estimatedBudget: estimatedBudget || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        memberIds: form.memberIds.length ? form.memberIds : undefined,
      });

      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (!m.name.trim()) continue;
        await createMilestone.mutateAsync({
          projectId: project.id,
          payload: {
            name: m.name,
            billingAmount: Number(m.billingAmount) || undefined,
            dueDate: m.dueDate || undefined,
            currency: form.currency,
            order: i + 1,
          },
        });
      }

      toast.success(`Project ${project.projectCode} created.`);
      router.push(`/projects/${project.id}`);
    } catch {
      /* interceptor */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cdy-white">Create Project</h2>
        <Link
          href="/projects"
          className="text-sm text-cdy-muted hover:text-cdy-white"
        >
          ← Back to overview
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-cdy-navy-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-cdy-red text-cdy-red'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-cdy-navy-border/50 bg-cdy-navy-light p-6">
        {tab === 'info' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              />
            </div>
            <div>
              <Label>Client</Label>
              <ClientSearch value={client} onChange={setClient} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="serviceType">Service type *</Label>
                <select
                  id="serviceType"
                  value={form.serviceType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, serviceType: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: e.target.value as ProjectPriority,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">Start date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="estimatedBudget">Estimated budget</Label>
                <Input
                  id="estimatedBudget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedBudget}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimatedBudget: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
                >
                  <option value="USD">USD</option>
                  <option value="RWF">RWF</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="managerId">Project manager *</Label>
              <select
                id="managerId"
                value={form.managerId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, managerId: e.target.value }))
                }
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
              <Label>Team members</Label>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-cdy-navy-border p-3">
                {employees?.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-cdy-navy"
                  >
                    <input
                      type="checkbox"
                      checked={form.memberIds.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                      className="rounded border-cdy-navy-border"
                    />
                    <div>
                      <p className="text-sm font-medium text-cdy-white">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-cdy-muted">
                        {emp.jobTitle}
                        {'departmentName' in emp && emp.departmentName
                          ? ` · ${emp.departmentName}`
                          : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'milestones' && (
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-md border border-cdy-navy-border p-3 sm:grid-cols-[1fr_120px_140px_32px]"
              >
                <Input
                  placeholder="Milestone name"
                  value={milestone.name}
                  onChange={(e) =>
                    updateMilestone(index, 'name', e.target.value)
                  }
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={milestone.billingAmount}
                  onChange={(e) =>
                    updateMilestone(index, 'billingAmount', e.target.value)
                  }
                />
                <Input
                  type="date"
                  value={milestone.dueDate}
                  onChange={(e) =>
                    updateMilestone(index, 'dueDate', e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="text-cdy-muted hover:text-cdy-red"
                  aria-label="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addMilestone}>
              + Add milestone
            </Button>
            {estimatedBudget > 0 && (
              <div className="rounded-md bg-cdy-navy p-4 text-sm">
                <div className="flex justify-between text-cdy-muted">
                  <span>Total milestone value</span>
                  <span className="text-cdy-white">
                    {formatCurrency(milestoneTotal, form.currency)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-cdy-muted">
                  <span>Estimated budget</span>
                  <span className="text-cdy-white">
                    {formatCurrency(estimatedBudget, form.currency)}
                  </span>
                </div>
                <div
                  className={cn(
                    'mt-1 flex justify-between font-medium',
                    remaining < 0 ? 'text-cdy-red' : 'text-emerald-400',
                  )}
                >
                  <span>Remaining unallocated</span>
                  <span>{formatCurrency(remaining, form.currency)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/projects">
          <Button variant="outline">Cancel</Button>
        </Link>
        <PermissionGate feature="projects.all" action="write">
          <Button
            onClick={() => void handleSubmit()}
            disabled={createProject.isPending}
          >
            Create Project
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}
