import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { startOfWeek, parseISO, format } from 'date-fns';
import {
  MarketingSummaryService,
  SummaryPeriod,
} from './summary/marketing-summary.service';
import { ContentService } from './content/content.service';
import { CalendarPdfService } from './content/calendar-pdf.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

function resolveWeekStart(week?: string): Date {
  const base = week ? parseISO(week) : new Date();
  return startOfWeek(base, { weekStartsOn: 1 });
}

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly summaryService: MarketingSummaryService,
    private readonly contentService: ContentService,
    private readonly calendarPdfService: CalendarPdfService,
  ) {}

  @Get('summary')
  @RequirePermission('marketing.clients', 'read')
  async getAllSummary(
    @Query('month') month: string,
    @Query('period') period?: SummaryPeriod,
    @Query('date') date?: string,
  ) {
    if (period) {
      const d = date ?? format(new Date(), 'yyyy-MM-dd');
      const data = await this.summaryService.getAllClientsSummaryForPeriod(period, d);
      return { data, statusCode: HttpStatus.OK };
    }
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

  @Get('calendar/today')
  @RequirePermission('marketing.content', 'read')
  async getTodaysContent() {
    const data = await this.contentService.getTodaysContent();
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('calendar/pdf')
  @RequirePermission('marketing.content', 'read')
  async downloadGlobalCalendarPdf(
    @Query('week') week: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const weekStart = resolveWeekStart(week);
    const buffer = await this.calendarPdfService.generateForAllClients(weekStart);
    const weekPart = this.calendarPdfService.weekFilenamePart(weekStart);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Content-Calendar-${weekPart}.pdf"`,
    );
    res.send(buffer);
  }
}
