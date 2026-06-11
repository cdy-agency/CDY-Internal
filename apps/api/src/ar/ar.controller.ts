import { Controller, Get, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ArService } from './ar.service';
import { ArFiltersDto } from './dto/ar-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@cdy/shared';

@ApiTags('ar')
@ApiBearerAuth()
@Controller('ar')
@UseGuards(RolesGuard)
export class ArController {
  constructor(private readonly arService: ArService) {}

  @Get()
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
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
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
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
