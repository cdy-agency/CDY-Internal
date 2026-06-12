import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ItManagementService } from './it-management.service';

@ApiTags('it-features')
@ApiBearerAuth()
@Controller('it')
export class FeaturesController {
  constructor(private readonly itService: ItManagementService) {}

  @Get('features')
  @RequirePermission('it.permissions', 'read')
  @ApiOperation({ summary: 'List all system features' })
  async listFeatures() {
    const data = await this.itService.listFeatures();
    return { data, message: 'Features retrieved', statusCode: HttpStatus.OK };
  }

  @Get('audit')
  @RequirePermission('it.audit', 'read')
  @ApiOperation({ summary: 'IT audit log' })
  async listAudit(
    @Query('action') action?: string,
    @Query('performedBy') performedBy?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.itService.listAuditLogs({
      action,
      performedBy,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data, message: 'Audit log retrieved', statusCode: HttpStatus.OK };
  }

  @Get('overview')
  @RequirePermission('it.users', 'read')
  @ApiOperation({ summary: 'IT dashboard overview' })
  async overview() {
    const data = await this.itService.getOverview();
    return { data, message: 'Overview retrieved', statusCode: HttpStatus.OK };
  }
}
