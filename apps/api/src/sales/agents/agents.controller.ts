import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { DeployAgentDto } from './dto/deploy-agent.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('campaigns/:id/agents')
  @RequirePermission('sales.campaigns', 'write')
  deploy(@Param('id') campaignId: string, @Body() dto: DeployAgentDto) {
    return this.agentsService.deploy(campaignId, dto);
  }

  @Delete('agents/:agentId')
  @RequirePermission('sales.campaigns', 'write')
  remove(@Param('agentId') agentId: string) {
    return this.agentsService.remove(agentId);
  }

  @Get('agents/:agentId/performance')
  @RequirePermission('sales.reporting', 'read')
  getPerformance(
    @Param('agentId') agentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agentsService.getAgentPerformance(
      agentId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
