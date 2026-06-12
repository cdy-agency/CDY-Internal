import { Injectable } from '@nestjs/common';
import { LeadSource } from '@prisma/client';

export type LeadScoreBand = 'hot' | 'warm' | 'cold';

export interface ScoreWeights {
  source: number;
  value: number;
  contact: number;
  engagement: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  source: 30,
  value: 30,
  contact: 20,
  engagement: 20,
};

export interface LeadScoringInput {
  source: LeadSource;
  estimatedValue?: number;
  serviceInterest: string;
  hasPhone: boolean;
  hasEmail: boolean;
  activityCount?: number;
  weights?: ScoreWeights;
}

@Injectable()
export class LeadScoringService {
  calculate(data: LeadScoringInput): number {
    const weights = data.weights ?? DEFAULT_SCORE_WEIGHTS;
    let score = 0;

    const sourceScores: Record<LeadSource, number> = {
      REFERRAL: weights.source,
      RETURNING_CLIENT: weights.source,
      PARTNER: Math.round(weights.source * 0.83),
      WEBSITE: Math.round(weights.source * 0.67),
      EVENT: Math.round(weights.source * 0.67),
      SOCIAL_MEDIA: Math.round(weights.source * 0.5),
      COLD_OUTREACH: Math.round(weights.source * 0.33),
      OTHER: Math.round(weights.source * 0.17),
    };
    score += sourceScores[data.source] ?? Math.round(weights.source * 0.17);

    if (data.estimatedValue !== undefined) {
      const maxValue = weights.value;
      if (data.estimatedValue >= 50000) score += maxValue;
      else if (data.estimatedValue >= 20000) score += Math.round(maxValue * 0.83);
      else if (data.estimatedValue >= 10000) score += Math.round(maxValue * 0.67);
      else if (data.estimatedValue >= 5000) score += Math.round(maxValue * 0.5);
      else if (data.estimatedValue >= 1000) score += Math.round(maxValue * 0.33);
      else score += Math.round(maxValue * 0.17);
    }

    const contactHalf = Math.round(weights.contact / 2);
    if (data.hasPhone) score += contactHalf;
    if (data.hasEmail) score += contactHalf;

    const activities = data.activityCount ?? 0;
    if (activities >= 5) score += weights.engagement;
    else if (activities >= 3) score += Math.round(weights.engagement * 0.75);
    else if (activities >= 1) score += Math.round(weights.engagement * 0.5);

    void data.serviceInterest;

    return Math.min(score, 100);
  }

  getBand(score: number): LeadScoreBand {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
  }
}
