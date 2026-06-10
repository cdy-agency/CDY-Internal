import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@cdy/shared';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
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
