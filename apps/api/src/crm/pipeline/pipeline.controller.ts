import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { PipelineService } from './pipeline.service';
import { ConversionFiltersDto } from './dto/conversion-filters.dto';

@ApiTags('crm-pipeline')
@ApiBearerAuth()
@Controller('crm/pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  @RequirePermission('crm.pipeline', 'read')
  @ApiOperation({ summary: 'Get kanban pipeline board data' })
  async getBoard(@CurrentUser() user: JwtPayload) {
    const data = await this.pipelineService.getBoard(user.sub);
    return { data, message: 'Pipeline retrieved', statusCode: HttpStatus.OK };
  }

  @Get('conversion-report')
  @RequirePermission('crm.reports', 'read')
  @ApiOperation({ summary: 'Get lead conversion funnel report' })
  async getConversionReport(@Query() filters: ConversionFiltersDto) {
    const data = await this.pipelineService.getConversionReport(filters);
    return {
      data,
      message: 'Conversion report retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
