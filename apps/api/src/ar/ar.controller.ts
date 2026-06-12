import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ArService } from './ar.service';
import { ArFiltersDto } from './dto/ar-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('ar')
@ApiBearerAuth()
@Controller('ar')
export class ArController {
  constructor(private readonly arService: ArService) {}

  @Get()
  @RequirePermission('finance.ar', 'read')
  @ApiOperation({ summary: 'Accounts receivable ledger by client' })
  async getLedger(@Query() filters: ArFiltersDto) {
    const data = await this.arService.getLedger(filters);
    return {
      data,
      message: 'AR ledger retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('summary')
  @RequirePermission('finance.ar', 'read')
  @ApiOperation({ summary: 'AR summary aggregates' })
  async getSummary() {
    const data = await this.arService.getSummary();
    return {
      data,
      message: 'AR summary retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
