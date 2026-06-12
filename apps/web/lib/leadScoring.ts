import { LeadSource } from '@cdy/shared';

export type LeadScoreBand = 'hot' | 'warm' | 'cold';

export function calculateLeadScore(data: {
  source: LeadSource;
  estimatedValue?: number;
  hasPhone: boolean;
  hasEmail: boolean;
  activityCount?: number;
}): number {
  let score = 0;

  const sourceScores: Record<LeadSource, number> = {
    REFERRAL: 30,
    RETURNING_CLIENT: 30,
    PARTNER: 25,
    WEBSITE: 20,
    EVENT: 20,
    SOCIAL_MEDIA: 15,
    COLD_OUTREACH: 10,
    OTHER: 5,
  };
  score += sourceScores[data.source] ?? 5;

  if (data.estimatedValue !== undefined) {
    if (data.estimatedValue >= 50000) score += 30;
    else if (data.estimatedValue >= 20000) score += 25;
    else if (data.estimatedValue >= 10000) score += 20;
    else if (data.estimatedValue >= 5000) score += 15;
    else if (data.estimatedValue >= 1000) score += 10;
    else score += 5;
  }

  if (data.hasPhone) score += 10;
  if (data.hasEmail) score += 10;

  const activities = data.activityCount ?? 0;
  if (activities >= 5) score += 20;
  else if (activities >= 3) score += 15;
  else if (activities >= 1) score += 10;

  return Math.min(score, 100);
}

export function getScoreBand(score: number): LeadScoreBand {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export function scoreBandLabel(band: LeadScoreBand): string {
  if (band === 'hot') return 'Hot lead';
  if (band === 'warm') return 'Warm lead';
  return 'Cold lead';
}

export function scoreBandBorder(band: LeadScoreBand): string {
  if (band === 'hot') return 'border-l-cdy-red';
  if (band === 'warm') return 'border-l-amber-500';
  return 'border-l-slate-500';
}
