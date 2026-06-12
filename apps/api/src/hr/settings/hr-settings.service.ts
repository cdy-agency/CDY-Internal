import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

type HrSettingKey =
  | 'working_days'
  | 'working_hours_per_day'
  | 'leave_year_start'
  | 'carry_over_max_days'
  | 'probation_days';

@Injectable()
export class HrSettingsService implements OnApplicationBootstrap {
  private readonly DEFAULTS: Record<HrSettingKey, string> = {
    working_days: JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI']),
    working_hours_per_day: '8',
    leave_year_start: '01-01',
    carry_over_max_days: '5',
    probation_days: '90',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const [key, value] of Object.entries(this.DEFAULTS)) {
      await this.prisma.hrSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: 'system' },
        update: {},
      });
    }

    const leaveTypeCount = await this.prisma.leaveType.count();
    if (leaveTypeCount === 0) {
      const defaults = [
        { name: 'Annual Leave', code: 'AL', defaultDaysPerYear: 21, isPaid: true, requiresApproval: true, requiresDocument: false },
        { name: 'Sick Leave', code: 'SL', defaultDaysPerYear: 10, isPaid: true, requiresApproval: false, requiresDocument: false },
        { name: 'Unpaid Leave', code: 'UL', defaultDaysPerYear: 0, isPaid: false, requiresApproval: true, requiresDocument: false },
        { name: 'Public Holiday', code: 'PH', defaultDaysPerYear: 0, isPaid: true, requiresApproval: false, requiresDocument: false },
        { name: 'Maternity Leave', code: 'ML', defaultDaysPerYear: 84, isPaid: true, requiresApproval: true, requiresDocument: true },
        { name: 'Paternity Leave', code: 'PL', defaultDaysPerYear: 5, isPaid: true, requiresApproval: true, requiresDocument: false },
      ];
      for (const lt of defaults) {
        await this.prisma.leaveType.upsert({
          where: { code: lt.code },
          create: lt,
          update: {},
        });
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const cacheKey = `hr:settings:${key}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const setting = await this.prisma.hrSetting.findUnique({ where: { key } });
    const defaultValue = this.DEFAULTS[key as HrSettingKey];
    const value = setting?.value ?? defaultValue ?? null;

    if (value) await this.cache.set(cacheKey, value, 600);
    return value;
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.hrSetting.findMany();
    const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return { ...this.DEFAULTS, ...settingMap };
  }

  async set(key: string, value: string, userId: string): Promise<void> {
    await this.prisma.hrSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
    await this.cache.del(`hr:settings:${key}`);
  }
}
