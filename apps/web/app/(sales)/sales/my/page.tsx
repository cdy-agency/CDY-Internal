'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyLogs, useSalesCampaigns, useCreateLog, useUpdateLog } from '@/hooks/useSales';
import { PermissionGate } from '@/components/PermissionGate';
import type { DailyActivityLogRecord } from '@cdy/shared';

function LogForm({
  campaignId,
  existingLog,
  onClose,
}: {
  campaignId: string;
  existingLog: DailyActivityLogRecord | null;
  onClose: () => void;
}) {
  const createLog = useCreateLog();
  const updateLog = useUpdateLog(campaignId);

  const today = new Date().toISOString().split('T')[0];
  const [visits, setVisits] = useState(String(existingLog?.visitsCount ?? ''));
  const [leads, setLeads] = useState(String(existingLog?.leadsCount ?? ''));
  const [sales, setSales] = useState(String(existingLog?.salesCount ?? ''));
  const [amount, setAmount] = useState(existingLog?.salesAmount ? String(Number(existingLog.salesAmount)) : '');
  const [notes, setNotes] = useState(existingLog?.notes ?? '');
  const [challenges, setChallenges] = useState(existingLog?.challenges ?? '');

  useEffect(() => {
    if (existingLog) {
      setVisits(String(existingLog.visitsCount));
      setLeads(String(existingLog.leadsCount));
      setSales(String(existingLog.salesCount));
      setAmount(existingLog.salesAmount ? String(Number(existingLog.salesAmount)) : '');
      setNotes(existingLog.notes ?? '');
      setChallenges(existingLog.challenges ?? '');
    }
  }, [existingLog]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dto = {
      visitsCount: visits ? Number(visits) : 0,
      leadsCount: leads ? Number(leads) : 0,
      salesCount: sales ? Number(sales) : 0,
      salesAmount: amount ? Number(amount) : undefined,
      notes: notes || undefined,
      challenges: challenges || undefined,
    };

    if (existingLog) {
      await updateLog.mutateAsync({ logId: existingLog.id, ...dto });
    } else {
      await createLog.mutateAsync({
        campaignId,
        date: today,
        ...dto,
      });
    }
    onClose();
  }

  const isPending = createLog.isPending || updateLog.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-cdy-navy-border bg-cdy-navy-light shadow-xl">
        <div className="border-b border-cdy-navy-border p-6">
          <h2 className="text-base font-semibold text-cdy-white">
            {existingLog ? 'Edit Today\'s Log' : 'Log Today\'s Activity'}
          </h2>
          <p className="mt-0.5 text-sm text-cdy-muted">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Visits', value: visits, setter: setVisits },
              { label: 'Leads', value: leads, setter: setLeads },
              { label: 'Sales', value: sales, setter: setSales },
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs text-cdy-muted">{label}</Label>
                <Input type="number" min="0" value={value} onChange={(e) => setter(e.target.value)}
                  className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs text-cdy-muted">Sales amount ($)</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="bg-cdy-navy border-cdy-navy-border text-cdy-white" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Field notes</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="What happened today, key observations..."
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-cdy-muted">Challenges</Label>
            <textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} rows={2}
              placeholder="Any issues or blockers..."
              className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-cdy-muted">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-cdy-red text-white hover:bg-cdy-red/90">
              {isPending ? 'Submitting...' : existingLog ? 'Save changes' : 'Submit Log'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyActivityPage() {
  const { data: campaigns, isLoading: campaignsLoading } = useSalesCampaigns();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const activeCampaigns = campaigns?.filter((c) => c.status === 'ACTIVE') ?? [];

  useEffect(() => {
    if (activeCampaigns.length === 1 && !selectedCampaignId) {
      setSelectedCampaignId(activeCampaigns[0].id);
    }
  }, [activeCampaigns, selectedCampaignId]);

  const { data: logs, isLoading: logsLoading } = useMyLogs(selectedCampaignId || undefined);
  const [formOpen, setFormOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = logs?.find((l) => l.date.startsWith(today)) ?? null;

  const selectedCampaign = activeCampaigns.find((c) => c.id === selectedCampaignId);

  if (campaignsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!activeCampaigns.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-cdy-muted">
        <p className="text-sm">You are not deployed on any active sales campaigns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cdy-white">My Activity</h1>
        <p className="text-sm text-cdy-muted">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {activeCampaigns.length > 1 && (
        <div className="space-y-1">
          <Label className="text-cdy-muted">Campaign</Label>
          <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white">
            <option value="">Select a campaign</option>
            {activeCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.client.companyName}</option>
            ))}
          </select>
        </div>
      )}

      {selectedCampaignId && (
        <>
          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cdy-white">Today's Log</p>
                {selectedCampaign && (
                  <p className="text-xs text-cdy-muted">{selectedCampaign.name}</p>
                )}
              </div>
              <PermissionGate feature="sales.reporting" action="write">
                <Button onClick={() => setFormOpen(true)} size="sm"
                  className="bg-cdy-red text-white hover:bg-cdy-red/90">
                  {todayLog ? 'Edit' : '+ Log Today'}
                </Button>
              </PermissionGate>
            </div>
            {todayLog ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Visits', value: todayLog.visitsCount },
                  { label: 'Leads', value: todayLog.leadsCount },
                  { label: 'Sales', value: todayLog.salesCount },
                  { label: 'Sales', value: todayLog.salesAmount ? `RWF${Number(todayLog.salesAmount).toLocaleString()}` : '—' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-xl font-bold text-cdy-white">{stat.value}</p>
                    <p className="text-xs text-cdy-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-cdy-muted">No log submitted for today yet.</p>
            )}
            {todayLog?.notes && (
              <p className="mt-3 text-sm text-cdy-muted italic">"{todayLog.notes}"</p>
            )}
          </div>

          <div className="rounded-lg border border-cdy-navy-border bg-cdy-navy-light">
            <div className="border-b border-cdy-navy-border px-6 py-4">
              <h2 className="text-sm font-semibold text-cdy-white">My History</h2>
            </div>
            {logsLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !logs?.length ? (
              <p className="px-6 py-8 text-center text-sm text-cdy-muted">No logs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cdy-navy-border text-left text-xs text-cdy-muted">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Visits</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                      <th className="px-4 py-3 text-right">Sales</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 30).map((log) => (
                      <tr key={log.id} className="border-b border-cdy-navy-border/50 hover:bg-cdy-navy/30">
                        <td className="px-4 py-3 text-cdy-white">
                          {new Date(log.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 text-right text-cdy-white">{log.visitsCount}</td>
                        <td className="px-4 py-3 text-right text-cdy-white">{log.leadsCount}</td>
                        <td className="px-4 py-3 text-right text-cdy-white">{log.salesCount}</td>
                        <td className="px-4 py-3 text-right text-cdy-muted">
                          {log.salesAmount ? `RWF${Number(log.salesAmount).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-cdy-muted max-w-xs truncate">{log.notes ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {formOpen && selectedCampaignId && (
        <LogForm
          campaignId={selectedCampaignId}
          existingLog={todayLog}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
