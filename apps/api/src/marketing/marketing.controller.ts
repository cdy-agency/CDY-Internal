import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingSummaryService } from './summary/marketing-summary.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private readonly summaryService: MarketingSummaryService) {}

  @Get('summary')
  @RequirePermission('marketing.reports', 'read')
  async getAllSummary(@Query('month') month: string) {
    const m =
      month ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const data = await this.summaryService.getAllClientsSummary(m);
    return { data, statusCode: HttpStatus.OK };
  }
}
