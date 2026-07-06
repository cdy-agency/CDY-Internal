'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { PipelineStage } from '@cdy/shared';
import type { LeadRecord } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/PermissionGate';
import { usePipelineBoard, useMoveLeadStage } from '@/hooks/useCrm';
import { AddLeadDrawer } from '@/components/crm/leads/AddLeadDrawer';
import { LeadCard } from '@/components/crm/pipeline/LeadCard';
import { CloseDealModal } from '@/components/crm/pipeline/CloseDealModal';
import { formatCurrency } from '@/lib/utils';

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

function DraggableLead({ lead }: { lead: LeadRecord }): JSX.Element {
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
      <LeadCard lead={lead} />
    </div>
  );
}

export default function PipelinePage(): JSX.Element {
  const { data: columns, isLoading } = usePipelineBoard();
  const moveStage = useMoveLeadStage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [closeLeadId, setCloseLeadId] = useState<string | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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

  const filteredColumns = columns?.map((col) => ({
    ...col,
    leads: col.leads
      .filter((lead) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (lead.companyName ?? '').toLowerCase().includes(q) ||
          lead.contactName.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)),
  }));

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

      <Input
        placeholder="Search leads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {isLoading && <p className="text-cdy-muted">Loading pipeline...</p>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredColumns?.map((column) => (
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
                  <DraggableLead key={lead.id} lead={lead as LeadRecord} />
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
    </div>
  );
}
