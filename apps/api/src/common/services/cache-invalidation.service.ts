import { Injectable } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { CacheKeys } from '../cache-keys';

@Injectable()
export class CacheInvalidationService {
  constructor(private readonly cache: CacheService) {}

  async invalidateCeoSummary(): Promise<void> {
    await this.cache.del(CacheKeys.CEO_SUMMARY);
  }

  async invalidateCrmSummary(): Promise<void> {
    await this.cache.del(CacheKeys.CRM_SUMMARY);
  }

  async invalidateCrmConversions(): Promise<void> {
    await this.cache.delByPrefix('crm:conversion:');
  }

  async invalidateCrmSettings(key?: string): Promise<void> {
    if (key) {
      await this.cache.del(CacheKeys.CRM_SETTINGS(key));
    } else {
      await this.cache.delByPrefix('crm:settings:');
    }
  }

  async invalidateHrSettings(key?: string): Promise<void> {
    if (key) {
      await this.cache.del(CacheKeys.HR_SETTINGS(key));
    } else {
      await this.cache.delByPrefix('hr:settings:');
    }
  }

  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidateCeoSummary(),
      this.invalidateCrmSummary(),
      this.invalidateCrmConversions(),
    ]);
  }
}
