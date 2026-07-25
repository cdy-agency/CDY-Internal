'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  LeadSource,
  PipelineStage,
} from '@cdy/shared';
import {
  useLeads,
  useSalesAgents,
  useSavedFilters,
  useSaveFilter,
  useBulkAssignLeads,
  useBulkMoveStage,
  useBulkDeleteLeads,
  exportLeadsCsv,
  type LeadFilters,
} from '@/hooks/useCrm';
import { AddLeadDrawer } from '@/components/crm/leads/AddLeadDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { getScoreBand, scoreBandBorder } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import { SERVICE_TYPE_OPTIONS } from '@/lib/reportDates';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';

const ACTIVE_STAGES: PipelineStage[] = [
  PipelineStage.NEW,
  PipelineStage.CONTACTED,
  PipelineStage.PROPOSAL_SENT,
  PipelineStage.NEGOTIATION,
];

const CLOSED_STAGES: PipelineStage[] = [
  PipelineStage.CLOSED_WON,
  PipelineStage.CLOSED_LOST,
];

const EMPTY_FILTERS: LeadFilters = {};

export default function LeadsListPage(): JSX.Element {
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [bulkAgent, setBulkAgent] = useState('');
  const [bulkStage, setBulkStage] = useState<PipelineStage>(PipelineStage.CONTACTED);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: leads, isLoading } = useLeads(appliedFilters);
  const { data: agents } = useSalesAgents();
  const { data: savedFilters } = useSavedFilters('crm.leads');
  const saveFilter = useSaveFilter();
  const bulkAssign = useBulkAssignLeads();
  const bulkMove = useBulkMoveStage();
  const bulkDelete = useBulkDeleteLeads();

  function applyFilters(): void {
    setAppliedFilters({ ...filters });
    setSelected(new Set());
  }

  function resetFilters(): void {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelected(new Set());
  }

  function applySavedFilter(saved: Record<string, unknown>): void {
    const next: LeadFilters = {
      stage: saved.stage as PipelineStage | undefined,
      search: saved.search as string | undefined,
      assignedTo: saved.assignedTo as string | undefined,
      createdBy: saved.createdBy as string | undefined,
      source: saved.source as LeadSource | undefined,
      serviceInterest: saved.serviceInterest as string | undefined,
      minScore: saved.minScore as number | undefined,
      maxScore: saved.maxScore as number | undefined,
      minValue: saved.minValue as number | undefined,
      maxValue: saved.maxValue as number | undefined,
      dateFrom: saved.dateFrom as string | undefined,
      dateTo: saved.dateTo as string | undefined,
      hasOverdueFollowUp: saved.hasOverdueFollowUp as boolean | undefined,
    };
    setFilters(next);
    setAppliedFilters(next);
  }

  function toggleSelect(id: string, stage: PipelineStage): void {
    if (stage === PipelineStage.CLOSED_WON) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      await exportLeadsCsv(appliedFilters);
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveFilter(): Promise<void> {
    if (!filterName.trim()) return;
    await saveFilter.mutateAsync({
      module: 'crm.leads',
      name: filterName.trim(),
      filters: appliedFilters as Record<string, unknown>,
    });
    setFilterName('');
    setSaveModalOpen(false);
  }

  const selectedCount = selected.size;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-cdy-white">Leads</h1>
        <div className="flex gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <PermissionGate feature="crm.leads" action="write">
            <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setDrawerOpen(true)}>
              + Add Lead
            </Button>
          </PermissionGate>
        </div>
      </div>

      {savedFilters && savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-cdy-muted">Saved:</span>
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              type="button"
              onClick={() => applySavedFilter(sf.filters)}
              className="rounded-full border border-cdy-navy-border bg-cdy-navy-light px-3 py-1 text-xs text-cdy-white hover:border-cdy-red"
            >
              {sf.name}
            </button>
          ))}
        </div>
      )}

      <Input
        placeholder="Search leads..."
        value={filters.search ?? ''}
        onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
        className="max-w-sm"
      />

      <button
        type="button"
        className="flex items-center gap-2 text-sm text-cdy-muted hover:text-cdy-white"
        onClick={() => setAdvancedOpen(!advancedOpen)}
      >
        {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Advanced filters
      </button>

      {advancedOpen && (
        <div className="grid gap-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs text-cdy-muted">Stage</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.stage ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  stage: (e.target.value as PipelineStage) || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(PipelineStage).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Source</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.source ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  source: (e.target.value as LeadSource) || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(LeadSource).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Assigned to</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.assignedTo ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, assignedTo: e.target.value || undefined })
              }
            >
              <option value="">All agents</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Created by</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.createdBy ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, createdBy: e.target.value || undefined })
              }
            >
              <option value="">Anyone</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Service type</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.serviceInterest ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, serviceInterest: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {SERVICE_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Score range</label>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minScore ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minScore: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxScore ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxScore: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Value range</label>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                placeholder="From"
                value={filters.minValue ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
              <Input
                type="number"
                placeholder="To"
                value={filters.maxValue ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Created from</label>
            <Input
              type="date"
              className="mt-1"
              value={filters.dateFrom ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Created to</label>
            <Input
              type="date"
              className="mt-1"
              value={filters.dateTo ?? ''}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value || undefined })
              }
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-cdy-muted">
              <input
                type="checkbox"
                checked={Boolean(filters.hasOverdueFollowUp)}
                onChange={(e) =>
                  setFilters({ ...filters, hasOverdueFollowUp: e.target.checked || undefined })
                }
              />
              Only show leads with overdue follow-ups
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">
            <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="outline" onClick={() => setSaveModalOpen(true)}>
              Save this filter...
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-cdy-muted">Loading leads...</p>}

      <div className="overflow-x-auto rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cdy-navy-border text-left text-cdy-muted">
              <th className="px-4 py-3 w-10" />
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Closed</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map((lead) => {
              const band = getScoreBand(lead.qualityScore ?? 0);
              const isClosedWon = lead.stage === PipelineStage.CLOSED_WON;
              const isClosed = CLOSED_STAGES.includes(lead.stage);
              return (
                <tr key={lead.id} className="border-b border-cdy-navy-border/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      disabled={isClosedWon}
                      title={isClosedWon ? 'Closed Won leads cannot be bulk-selected' : undefined}
                      onChange={() => toggleSelect(lead.id, lead.stage)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="font-medium text-cdy-white hover:text-cdy-red"
                    >
                      {lead.companyName ?? lead.contactName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-cdy-muted">{lead.contactName}</td>
                  <td className="px-4 py-3 text-cdy-muted">
                    {lead.stage.replace(/_/g, ' ')}
                    {isClosed && (
                      <span className="ml-1 text-xs text-cdy-muted">(closed)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded px-2 py-0.5 text-xs border-l-2',
                        scoreBandBorder(band),
                      )}
                    >
                      {lead.qualityScore ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-cdy-white">
                    {lead.estimatedValue != null
                      ? formatCurrency(Number(lead.estimatedValue), lead.currency)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {lead.assignedToName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {lead.createdByName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {format(new Date(lead.createdAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-cdy-muted whitespace-nowrap">
                    {isClosed
                      ? format(
                          new Date(lead.convertedAt ?? lead.updatedAt),
                          'MMM d, yyyy h:mm a',
                        )
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-cdy-navy-border bg-cdy-navy-light p-4 shadow-lg lg:left-60">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
            <span className="text-sm text-cdy-white">☑ {selectedCount} leads selected</span>
            <select
              className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={bulkAgent}
              onChange={(e) => setBulkAgent(e.target.value)}
            >
              <option value="">Assign to agent...</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!bulkAgent || bulkAssign.isPending}
              onClick={() => {
                void bulkAssign.mutateAsync(
                  { leadIds: Array.from(selected), agentId: bulkAgent },
                  { onSuccess: () => setSelected(new Set()) },
                );
              }}
            >
              Assign
            </Button>
            <select
              className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value as PipelineStage)}
            >
              {ACTIVE_STAGES.map((s) => (
                <option key={s} value={s}>
                  Move to {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkMove.isPending}
              onClick={() => {
                void bulkMove.mutateAsync(
                  { leadIds: Array.from(selected), stage: bulkStage },
                  { onSuccess: () => setSelected(new Set()) },
                );
              }}
            >
              Move stage
            </Button>
            {!deleteConfirm ? (
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(true)}>
                Delete
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={bulkDelete.isPending}
                onClick={() => {
                  void bulkDelete.mutateAsync(
                    { leadIds: Array.from(selected) },
                    {
                      onSuccess: () => {
                        setSelected(new Set());
                        setDeleteConfirm(false);
                      },
                    },
                  );
                }}
              >
                Confirm delete ({selectedCount})
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelected(new Set());
                setDeleteConfirm(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <h2 className="text-lg font-semibold text-cdy-white">Save filter</h2>
            <Input
              className="mt-4"
              placeholder='e.g. "High-value marketing leads"'
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cdy-red hover:bg-cdy-red/90"
                disabled={!filterName.trim() || saveFilter.isPending}
                onClick={() => void handleSaveFilter()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddLeadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
