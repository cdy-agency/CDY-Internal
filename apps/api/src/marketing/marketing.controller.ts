import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingSummaryService } from './summary/marketing-summary.service';
import { ContentService } from './content/content.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly summaryService: MarketingSummaryService,
    private readonly contentService: ContentService,
  ) {}

  @Get('summary')
  @RequirePermission('marketing.clients', 'read')
  async getAllSummary(@Query('month') month: string) {
    const m =
      month ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const data = await this.summaryService.getAllClientsSummary(m);
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('calendar')
  @RequirePermission('marketing.content', 'read')
  async getGlobalCalendar(@Query('month') month: string) {
    const m =
      month ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const data = await this.contentService.getGlobalCalendar(m);
    return { data, statusCode: HttpStatus.OK };
  }
}
