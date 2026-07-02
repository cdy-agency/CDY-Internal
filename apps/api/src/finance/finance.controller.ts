import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @RequirePermission('finance.dashboard', 'read')
  @ApiOperation({ summary: 'Get finance overview summary metrics' })
  async getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const rangeStart = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined;
    const rangeEnd = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined;
    const data = await this.financeService.getSummary(rangeStart, rangeEnd);
    return {
      data,
      message: 'Finance summary retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
