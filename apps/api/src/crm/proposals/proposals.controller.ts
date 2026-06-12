import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';

function toActor(user: JwtPayload) {
  return { userId: user.sub, userEmail: user.email };
}

@ApiTags('crm-proposals')
@ApiBearerAuth()
@Controller('crm/leads/:leadId/proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  @RequirePermission('crm.proposals', 'write')
  @ApiOperation({ summary: 'Create proposal for lead' })
  async create(
    @Param('leadId') leadId: string,
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.create(
      leadId,
      dto,
      user.sub,
      user.roleKey,
      toActor(user),
    );
    return { data, message: 'Proposal created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('crm.proposals', 'read')
  @ApiOperation({ summary: 'List proposals for lead' })
  async findAll(
    @Param('leadId') leadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.findAll(
      leadId,
      user.sub,
      user.roleKey,
    );
    return { data, message: 'Proposals retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('crm.proposals', 'write')
  @ApiOperation({ summary: 'Update proposal' })
  async update(
    @Param('leadId') leadId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.update(
      leadId,
      id,
      dto,
      user.sub,
      user.roleKey,
    );
    return { data, message: 'Proposal updated', statusCode: HttpStatus.OK };
  }

  @Patch(':id/status')
  @RequirePermission('crm.proposals', 'write')
  @ApiOperation({ summary: 'Update proposal status' })
  async updateStatus(
    @Param('leadId') leadId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProposalStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.updateStatus(
      leadId,
      id,
      dto,
      user.sub,
      user.roleKey,
      toActor(user),
    );
    return {
      data,
      message: 'Proposal status updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/send')
  @RequirePermission('crm.proposals', 'write')
  @ApiOperation({ summary: 'Mark proposal as sent' })
  async send(
    @Param('leadId') leadId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.proposalsService.send(
      leadId,
      id,
      user.sub,
      user.roleKey,
      toActor(user),
    );
    return { data, message: 'Proposal sent', statusCode: HttpStatus.OK };
  }
}
