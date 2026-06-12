import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CrmAuditService } from './crm-audit.service';
import { CrmAuditFiltersDto } from './dto/crm-audit-filters.dto';

@ApiTags('crm-audit')
@ApiBearerAuth()
@Controller('crm/audit')
export class CrmAuditController {
  constructor(private readonly crmAuditService: CrmAuditService) {}

  @Get()
  @RequirePermission('crm.reports', 'read')
  @ApiOperation({ summary: 'List CRM audit log entries' })
  async findAll(@Query() filters: CrmAuditFiltersDto) {
    const data = await this.crmAuditService.findAll(filters);
    return { data, message: 'Audit log retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':entityId')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get audit entries for an entity' })
  async findByEntity(@Param('entityId') entityId: string) {
    const data = await this.crmAuditService.findByEntity(entityId);
    return { data, message: 'Entity audit retrieved', statusCode: HttpStatus.OK };
  }
}
