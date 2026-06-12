import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CrmSummaryService } from './crm-summary.service';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private readonly crmSummaryService: CrmSummaryService) {}

  @Get('summary')
  @RequirePermission('crm.pipeline', 'read')
  @ApiOperation({ summary: 'CRM dashboard summary metrics' })
  async getSummary() {
    const data = await this.crmSummaryService.getSummary();
    return { data, message: 'CRM summary retrieved', statusCode: HttpStatus.OK };
  }
}
