import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  CreateContentItemDto,
  UpdateContentItemDto,
  UpdateContentStatusDto,
} from './dto/create-content-item.dto';
import { ContentFiltersDto } from './dto/content-filters.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { MarketingSummaryService } from '../summary/marketing-summary.service';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing/clients/:clientId')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly summaryService: MarketingSummaryService,
  ) {}

  @Get('content')
  @RequirePermission('marketing.content', 'read')
  async findByClient(
    @Param('clientId') clientId: string,
    @Query() filters: ContentFiltersDto,
  ) {
    const data = await this.contentService.findByClient(clientId, filters);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post('content')
  @RequirePermission('marketing.content', 'write')
  async create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContentItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.contentService.create(clientId, dto, user.sub);
    return { data, message: 'Content item created', statusCode: HttpStatus.CREATED };
  }

  @Get('calendar')
  @RequirePermission('marketing.content', 'read')
  async getCalendar(
    @Param('clientId') clientId: string,
    @Query('month') month: string,
  ) {
    const m = month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const data = await this.contentService.getCalendar(clientId, m);
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch('content/:itemId')
  @RequirePermission('marketing.content', 'write')
  async update(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateContentItemDto,
  ) {
    const data = await this.contentService.update(itemId, dto);
    return { data, message: 'Content item updated', statusCode: HttpStatus.OK };
  }

  @Patch('content/:itemId/status')
  @RequirePermission('marketing.content', 'write')
  async updateStatus(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateContentStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.contentService.updateStatus(
      itemId,
      dto.status,
      user.sub,
    );
    return { data, message: 'Status updated', statusCode: HttpStatus.OK };
  }

  @Delete('content/:itemId')
  @RequirePermission('marketing.content', 'write')
  async softDelete(@Param('itemId') itemId: string) {
    const data = await this.contentService.softDelete(itemId);
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @RequirePermission('marketing.content', 'read')
  async getSummary(
    @Param('clientId') clientId: string,
    @Query('month') month: string,
  ) {
    const m = month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const data = await this.summaryService.getMonthlySummary(clientId, m);
    return { data, statusCode: HttpStatus.OK };
  }
}
