import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { HrAuditService } from './hr-audit.service';
import { HrAuditFiltersDto } from './dto/hr-audit-filters.dto';

@ApiTags('hr-audit')
@ApiBearerAuth()
@Controller('hr/audit')
export class HrAuditController {
  constructor(private readonly hrAuditService: HrAuditService) {}

  @Get()
  @RequirePermission('hr.settings', 'read')
  @ApiOperation({ summary: 'List HR audit log entries' })
  async findAll(@Query() filters: HrAuditFiltersDto) {
    const data = await this.hrAuditService.findAll(filters);
    return { data, message: 'Audit log retrieved', statusCode: HttpStatus.OK };
  }
}
