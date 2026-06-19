import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('it')
@ApiBearerAuth()
@Controller('it')
export class ItController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('cron-logs')
  @RequirePermission('it.audit', 'read')
  @ApiOperation({ summary: 'List cron job execution logs (IT Admin)' })
  async getCronLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('jobName') jobName?: string,
  ) {
    const where = jobName ? { jobName } : {};
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.cronLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cronLog.count({ where }),
    ]);

    return {
      data: { items, total, page, limit, pages: Math.ceil(total / limit) },
      message: 'Cron logs retrieved',
      statusCode: 200,
    };
  }
}
