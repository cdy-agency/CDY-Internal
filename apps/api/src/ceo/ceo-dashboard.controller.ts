import { Controller, Get } from '@nestjs/common';
import { CeoDashboardService } from './ceo-dashboard.service';
import { CacheService } from '../cache/cache.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CacheKeys, CacheTTL } from '../common/cache-keys';

@Controller('ceo')
export class CeoDashboardController {
  constructor(
    private readonly ceoDashboardService: CeoDashboardService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('summary')
  @RequirePermission('ceo.dashboard', 'read')
  async getSummary() {
    const cached = await this.cacheService.get<Awaited<ReturnType<CeoDashboardService['getFullSummary']>>>(CacheKeys.CEO_SUMMARY);
    if (cached) return { data: cached, message: 'OK', statusCode: 200 };

    const data = await this.ceoDashboardService.getFullSummary();
    await this.cacheService.set(CacheKeys.CEO_SUMMARY, data, CacheTTL.CEO_SUMMARY);
    return { data, message: 'OK', statusCode: 200 };
  }
}
