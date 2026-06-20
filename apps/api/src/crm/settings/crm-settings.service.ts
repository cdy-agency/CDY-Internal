import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { CacheKeys } from '../../common/cache-keys';

type CrmSettingKey =
  | 'lost_reasons'
  | 'default_currency'
  | 'lead_auto_assign'
  | 'proposal_expiry_days'
  | 'score_weights';

@Injectable()
export class CrmSettingsService implements OnApplicationBootstrap {
  private readonly DEFAULTS: Record<CrmSettingKey, string> = {
    lost_reasons: JSON.stringify([
      'Price too high',
      'Chose competitor',
      'Timeline mismatch',
      'No budget',
      'No response',
      'Out of scope',
      'Other',
    ]),
    default_currency: 'RWF',
    lead_auto_assign: 'false',
    proposal_expiry_days: '30',
    score_weights: JSON.stringify({
      source: 30,
      value: 30,
      contact: 20,
      engagement: 20,
    }),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const [key, value] of Object.entries(this.DEFAULTS)) {
      await this.prisma.crmSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: 'system' },
        update: {},
      });
    }
  }

  async get(key: string): Promise<string | null> {
    const cacheKey = CacheKeys.CRM_SETTINGS(key);
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const setting = await this.prisma.crmSetting.findUnique({ where: { key } });
    const defaultValue = this.DEFAULTS[key as CrmSettingKey];
    const value = setting?.value ?? defaultValue ?? null;

    if (value) {
      await this.cache.set(cacheKey, value, 600);
    }
    return value;
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.crmSetting.findMany();
    const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return { ...this.DEFAULTS, ...settingMap };
  }

  async set(key: string, value: string, userId: string): Promise<void> {
    await this.prisma.crmSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
    await this.cache.del(CacheKeys.CRM_SETTINGS(key));
  }

  async getLostReasons(): Promise<string[]> {
    const raw = await this.get('lost_reasons');
    return JSON.parse(raw ?? '[]') as string[];
  }

  async getScoreWeights(): Promise<{
    source: number;
    value: number;
    contact: number;
    engagement: number;
  }> {
    const raw = await this.get('score_weights');
    return JSON.parse(raw ?? '{}') as {
      source: number;
      value: number;
      contact: number;
      engagement: number;
    };
  }
}
