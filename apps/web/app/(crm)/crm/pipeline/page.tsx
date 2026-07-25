'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { LeadSource, PipelineStage } from '@cdy/shared';
import type { LeadRecord } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import {
  usePipelineBoard,
  useMoveLeadStage,
  useSalesAgents,
  type LeadFilters,
} from '@/hooks/useCrm';
import { AddLeadDrawer } from '@/components/crm/leads/AddLeadDrawer';
import { EditLeadDrawer } from '@/components/crm/leads/EditLeadDrawer';
import { LeadCard } from '@/components/crm/pipeline/LeadCard';
import { CloseDealModal } from '@/components/crm/pipeline/CloseDealModal';
import { formatCurrency } from '@/lib/utils';
import { SERVICE_TYPE_OPTIONS } from '@/lib/reportDates';
import { ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY_FILTERS: LeadFilters = {};

const STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.NEW]: 'New',
  [PipelineStage.CONTACTED]: 'Contacted',
  [PipelineStage.PROPOSAL_SENT]: 'Proposal Sent',
  [PipelineStage.NEGOTIATION]: 'Negotiation',
  [PipelineStage.CLOSED_WON]: 'Closed Won',
  [PipelineStage.CLOSED_LOST]: 'Closed Lost',
};

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-cdy-red/50' : ''}`}
    >
      {children}
    </div>
  );
}

function DraggableLead({
  lead,
  onEdit,
}: {
  lead: LeadRecord;
  onEdit: () => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50' : undefined}
    >
      <LeadCard lead={lead} onEdit={onEdit} />
    </div>
  );
}

export default function PipelinePage(): JSX.Element {
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { data: columns, isLoading } = usePipelineBoard(appliedFilters);
  const { data: agents } = useSalesAgents();
  const moveStage = useMoveLeadStage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closeLeadId, setCloseLeadId] = useState<string | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function applyFilters(): void {
    setAppliedFilters({ ...filters });
  }

  function resetFilters(): void {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function handleDragStart(event: DragStartEvent): void {
    const lead = columns
      ?.flatMap((c) => c.leads)
      .find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead as LeadRecord);
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const newStage = event.over?.id as PipelineStage | undefined;
    if (!newStage) return;

    const lead = columns?.flatMap((c) => c.leads).find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    if (
      newStage === PipelineStage.CLOSED_WON ||
      newStage === PipelineStage.CLOSED_LOST
    ) {
      setCloseLeadId(leadId);
      setCloseModalOpen(true);
      return;
    }

    void moveStage
      .mutateAsync({ leadId, stage: newStage })
      .catch(() => undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cdy-white">Sales Pipeline</h1>
          <p className="text-sm text-cdy-muted">Drag leads between stages</p>
        </div>
        <PermissionGate feature="crm.leads" action="write">
          <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={() => setDrawerOpen(true)}>
            + Add Lead
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs text-cdy-muted">Search</label>
          <Input
            placeholder="Company, contact, or email..."
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value || undefined })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            className="mt-1"
          />
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
        <div>
          <label className="text-xs text-cdy-muted">Sort by</label>
          <select
            className="mt-1 h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            value={filters.sortBy ?? 'updatedAt'}
            onChange={(e) =>
              setFilters({
                ...filters,
                sortBy: (e.target.value as LeadFilters['sortBy']) || 'updatedAt',
              })
            }
          >
            <option value="updatedAt">Last updated</option>
            <option value="createdAt">Date created</option>
            <option value="estimatedValue">Value</option>
            <option value="companyName">Name</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-cdy-muted">Order</label>
          <select
            className="mt-1 h-10 rounded-md border border-cdy-navy-border bg-cdy-navy px-3 text-sm text-cdy-white"
            value={filters.sortOrder ?? 'desc'}
            onChange={(e) =>
              setFilters({
                ...filters,
                sortOrder: (e.target.value as 'asc' | 'desc') || 'desc',
              })
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <Button className="bg-cdy-red hover:bg-cdy-red/90" onClick={applyFilters}>
          Search
        </Button>
      </div>

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
            <label className="text-xs text-cdy-muted">Lead kind</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.leadKind ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  leadKind: (e.target.value as 'venture' | 'service') || undefined,
                })
              }
            >
              <option value="">All</option>
              <option value="venture">Venture</option>
              <option value="service">Service (not venture)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-cdy-muted">Contact type</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white"
              value={filters.leadType ?? ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  leadType:
                    (e.target.value as 'COMPANY' | 'INDIVIDUAL') || undefined,
                })
              }
            >
              <option value="">All</option>
              <option value="COMPANY">Company</option>
              <option value="INDIVIDUAL">Person (not company)</option>
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
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-cdy-muted">
              <input
                type="checkbox"
                checked={Boolean(filters.hasOverdueFollowUp)}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    hasOverdueFollowUp: e.target.checked || undefined,
                  })
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
          </div>
        </div>
      )}

      {isLoading && <p className="text-cdy-muted">Loading pipeline...</p>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns?.map((column) => (
            <DroppableColumn
              key={column.stage}
              id={column.stage}
              className="min-h-[400px] rounded-lg border border-cdy-navy-border bg-cdy-navy/40 p-3"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-cdy-navy-border pb-3">
                <span className="font-medium text-cdy-white">
                  {STAGE_LABELS[column.stage]}
                </span>
                <span className="rounded-full bg-cdy-navy-light px-2 py-0.5 text-xs text-cdy-muted">
                  {column.count}
                </span>
                <span className="text-xs text-cdy-muted">
                  {formatCurrency(column.totalValue)}
                </span>
              </div>
              <div className="space-y-3">
                {column.leads.map((lead) => (
                  <DraggableLead
                    key={lead.id}
                    lead={lead as LeadRecord}
                    onEdit={() => setEditLead(lead as LeadRecord)}
                  />
                ))}
              </div>
            </DroppableColumn>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <DroppableColumn
            id={PipelineStage.CLOSED_WON}
            className="rounded-md border border-dashed border-green-500/40 bg-green-950/20 p-6 text-center text-sm text-green-400"
          >
            Drop here → Closed Won
          </DroppableColumn>
          <DroppableColumn
            id={PipelineStage.CLOSED_LOST}
            className="rounded-md border border-dashed border-cdy-red/40 bg-cdy-red/10 p-6 text-center text-sm text-cdy-red"
          >
            Drop here → Closed Lost
          </DroppableColumn>
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>

      <AddLeadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CloseDealModal
        open={closeModalOpen}
        leadId={closeLeadId}
        onClose={() => {
          setCloseModalOpen(false);
          setCloseLeadId(null);
        }}
        onSuccess={() => {
          toast.success('Deal closed! Draft invoice created in Finance.');
        }}
      />

      <EditLeadDrawer
        open={Boolean(editLead)}
        lead={editLead}
        onClose={() => setEditLead(null)}
      />
    </div>
  );
}
