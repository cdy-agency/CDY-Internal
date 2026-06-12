import { Controller, Get, HttpStatus } from '@nestjs/common';
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
  async getSummary() {
    const data = await this.financeService.getSummary();
    return {
      data,
      message: 'Finance summary retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
