'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  useCrmSettings,
  useUpdateCrmSetting,
  parseScoreWeights,
} from '@/hooks/useCrm';
import type { CrmScoreWeights } from '@cdy/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'lost-reasons' | 'score-weights';

export default function CrmSettingsPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('general');
  const { data: settings, isLoading } = useCrmSettings();
  const updateSetting = useUpdateCrmSetting();

  const [currency, setCurrency] = useState('USD');
  const [expiryDays, setExpiryDays] = useState('30');
  const [autoAssign, setAutoAssign] = useState('false');
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [weights, setWeights] = useState<CrmScoreWeights>({
    source: 30,
    value: 30,
    contact: 20,
    engagement: 20,
  });

  useEffect(() => {
    if (!settings) return;
    setCurrency(settings.default_currency ?? 'USD');
    setExpiryDays(settings.proposal_expiry_days ?? '30');
    setAutoAssign(settings.lead_auto_assign ?? 'false');
    setLostReasons(JSON.parse(settings.lost_reasons ?? '[]') as string[]);
    setWeights(parseScoreWeights(settings.score_weights));
  }, [settings]);

  const weightTotal =
    weights.source + weights.value + weights.contact + weights.engagement;

  async function saveGeneral(): Promise<void> {
    await updateSetting.mutateAsync({ key: 'default_currency', value: currency });
    await updateSetting.mutateAsync({
      key: 'proposal_expiry_days',
      value: expiryDays,
    });
    await updateSetting.mutateAsync({ key: 'lead_auto_assign', value: autoAssign });
  }

  async function saveLostReasons(): Promise<void> {
    await updateSetting.mutateAsync({
      key: 'lost_reasons',
      value: JSON.stringify(lostReasons.filter((r) => r.trim())),
    });
  }

  async function saveWeights(): Promise<void> {
    await updateSetting.mutateAsync({
      key: 'score_weights',
      value: JSON.stringify(weights),
    });
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'lost-reasons', label: 'Lost Reasons' },
    { id: 'score-weights', label: 'Score Weights' },
  ];

  return (
    <div className="space-y-6">
      <nav className="text-sm text-cdy-muted">
        <Link href="/crm" className="hover:text-cdy-white">CRM</Link>
        <span className="mx-2">/</span>
        <span className="text-cdy-white">Settings</span>
      </nav>

      <h1 className="text-2xl font-semibold text-cdy-white">CRM Settings</h1>

      <div className="flex gap-2 border-b border-cdy-navy-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-b-2 border-cdy-red text-cdy-white'
                : 'text-cdy-muted hover:text-cdy-white',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-cdy-muted">Loading settings...</p>}

      {tab === 'general' && settings && (
        <div className="max-w-md space-y-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <div>
            <label className="text-sm text-cdy-muted">Default currency</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="RWF">RWF</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-cdy-muted">Proposal expiry days</label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
              <span className="text-cdy-muted">days</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-cdy-muted">Auto-assign leads</label>
            <select
              className="mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-cdy-white"
              value={autoAssign}
              onChange={(e) => setAutoAssign(e.target.value)}
            >
              <option value="false">Off</option>
              <option value="true">Round robin</option>
            </select>
          </div>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={updateSetting.isPending}
            onClick={() => void saveGeneral()}
          >
            Save
          </Button>
        </div>
      )}

      {tab === 'lost-reasons' && settings && (
        <div className="max-w-lg space-y-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <p className="text-sm text-cdy-muted">
            These appear as options when marking a lead as Closed Lost.
          </p>
          <div className="space-y-2">
            {lostReasons.map((reason, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={reason}
                  onChange={(e) => {
                    const next = [...lostReasons];
                    next[idx] = e.target.value;
                    setLostReasons(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLostReasons(lostReasons.filter((_, i) => i !== idx))
                  }
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLostReasons([...lostReasons, ''])}
            >
              + Add reason
            </Button>
            <Button
              className="bg-cdy-red hover:bg-cdy-red/90"
              disabled={updateSetting.isPending}
              onClick={() => void saveLostReasons()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {tab === 'score-weights' && settings && (
        <div className="max-w-md space-y-4 rounded-lg border border-cdy-navy-border bg-cdy-navy-light p-6">
          <p className="text-sm text-cdy-muted">
            Adjust how the 100-point quality score is calculated. Total must equal 100.
          </p>
          {(
            [
              ['source', 'Lead source quality'],
              ['value', 'Estimated deal value'],
              ['contact', 'Contact completeness'],
              ['engagement', 'Engagement (activities)'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-cdy-muted">{label}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20"
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights({ ...weights, [key]: Number(e.target.value) })
                  }
                />
                <span className="text-cdy-muted">points</span>
              </div>
            </div>
          ))}
          <div className="border-t border-cdy-navy-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-cdy-muted">Total</span>
              <span
                className={cn(
                  'font-medium',
                  weightTotal === 100 ? 'text-emerald-400' : 'text-cdy-red',
                )}
              >
                {weightTotal} {weightTotal === 100 ? '✅' : '— must equal 100'}
              </span>
            </div>
          </div>
          <Button
            className="bg-cdy-red hover:bg-cdy-red/90"
            disabled={weightTotal !== 100 || updateSetting.isPending}
            onClick={() => void saveWeights()}
          >
            Save weights
          </Button>
        </div>
      )}
    </div>
  );
}
