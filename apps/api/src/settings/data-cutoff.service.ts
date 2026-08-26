import { Injectable } from '@nestjs/common';
import {
  SettingsService,
  EXCLUDE_OLD_DATA_ENABLED_KEY,
  EXCLUDE_OLD_DATA_CUTOFF_KEY,
} from './settings.service';

export interface DataCutoffState {
  enabled: boolean;
  cutoff: Date | null;
}

/**
 * Whether pre-migration data (before a configurable cutoff date) should be
 * excluded from company-wide totals. Backed by FinanceSetting rows that are
 * seeded from .env once (SettingsService.ensureDataCutoffDefaults) and then
 * edited live via the toggle on the CEO dashboard — see settings.controller.ts.
 */
@Injectable()
export class DataCutoffService {
  constructor(private readonly settingsService: SettingsService) {}

  async isEnabled(): Promise<boolean> {
    const value = await this.settingsService.get(EXCLUDE_OLD_DATA_ENABLED_KEY);
    return value === 'true';
  }

  /** Returns the cutoff Date only when the exclusion is enabled and a valid date is set, otherwise null. */
  async getCutoffDate(): Promise<Date | null> {
    const enabled = await this.isEnabled();
    if (!enabled) return null;

    const raw = await this.settingsService.get(EXCLUDE_OLD_DATA_CUTOFF_KEY);
    if (!raw) return null;

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Single read used by summary services to resolve both fields together
   * in one query. `enabled` reflects the toggle itself; `cutoff` is the
   * usable date to filter with, or null if the toggle is off or no valid
   * date is set yet (`enabled: true, cutoff: null` is a real, distinct
   * state — on, but not yet actually filtering anything).
   */
  async getState(): Promise<DataCutoffState> {
    const all = await this.settingsService.getAll();
    const enabled = all[EXCLUDE_OLD_DATA_ENABLED_KEY] === 'true';
    if (!enabled) return { enabled: false, cutoff: null };

    const raw = all[EXCLUDE_OLD_DATA_CUTOFF_KEY];
    if (!raw) return { enabled: true, cutoff: null };

    const date = new Date(raw);
    return { enabled: true, cutoff: Number.isNaN(date.getTime()) ? null : date };
  }
}

/** Returns whichever of `a`/`b` is later; `b` (the cutoff) may be absent. */
export function laterOf(a: Date, b?: Date | null): Date {
  return b && b > a ? b : a;
}
