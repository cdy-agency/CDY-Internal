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
  async deploy(@Param('id') campaignId: string, @Body() dto: DeployAgentDto) {
    const data = await this.agentsService.deploy(campaignId, dto);
    return { data, message: 'Agent deployed', statusCode: 201 };
  }

  @Delete('agents/:agentId')
  @RequirePermission('sales.campaigns', 'write')
  async remove(@Param('agentId') agentId: string) {
    const data = await this.agentsService.remove(agentId);
    return { data, message: 'Agent removed', statusCode: 200 };
  }

  @Get('agents/:agentId/performance')
  @RequirePermission('sales.reporting', 'read')
  async getPerformance(
    @Param('agentId') agentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.agentsService.getAgentPerformance(
      agentId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return { data, message: 'OK', statusCode: 200 };
  }
}
