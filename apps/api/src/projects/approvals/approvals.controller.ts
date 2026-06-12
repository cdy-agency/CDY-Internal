import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { DeliverableApprovalService } from './deliverable-approval.service';
import { RecordApprovalDto } from './approval.dto';

@ApiTags('project-approvals')
@ApiBearerAuth()
@Controller('projects/:projectId/approvals')
export class ApprovalsController {
  constructor(
    private readonly deliverableApprovalService: DeliverableApprovalService,
  ) {}

  @Get()
  @RequirePermission('projects.approvals', 'read')
  @ApiOperation({ summary: 'List deliverable approvals for project' })
  async findAll(@Param('projectId') projectId: string) {
    const data = await this.deliverableApprovalService.getByProject(projectId);
    return { data, message: 'Approvals retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':approvalId/decision')
  @RequirePermission('projects.approvals', 'write')
  @ApiOperation({ summary: 'Record approval decision' })
  async recordDecision(
    @Param('projectId') projectId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: RecordApprovalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.deliverableApprovalService.recordDecision(
      projectId,
      approvalId,
      dto,
      user.sub,
    );
    return { data, message: 'Decision recorded', statusCode: HttpStatus.OK };
  }
}
