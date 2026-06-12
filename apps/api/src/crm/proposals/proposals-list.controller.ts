import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { ProposalsService } from './proposals.service';
import { ProposalFiltersDto } from './dto/proposal-filters.dto';

@ApiTags('crm-proposals')
@ApiBearerAuth()
@Controller('crm/proposals')
export class ProposalsListController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @RequirePermission('crm.proposals', 'read')
  @ApiOperation({ summary: 'List all proposals across leads' })
  async findAll(
    @Query() filters: ProposalFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.findAllGlobal(
      filters,
      user.sub,
      user.roleKey,
    );
    return { data, message: 'Proposals retrieved', statusCode: HttpStatus.OK };
  }
}
