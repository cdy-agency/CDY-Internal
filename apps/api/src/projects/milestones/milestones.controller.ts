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
import { MilestonesService } from './milestones.service';
import { ProjectsSummaryService } from '../summary/projects-summary.service';
import {
  ApproveMilestoneDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from './dto/milestone.dto';

@ApiTags('project-milestones')
@ApiBearerAuth()
@Controller('projects/:projectId/milestones')
export class MilestonesController {
  constructor(
    private readonly milestonesService: MilestonesService,
    private readonly projectsSummaryService: ProjectsSummaryService,
  ) {}

  @Get()
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'List project milestones' })
  async findAll(@Param('projectId') projectId: string) {
    const data = await this.milestonesService.findByProject(projectId);
    return { data, message: 'Milestones retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Create milestone' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.milestonesService.create(projectId, dto, user.sub);
    return { data, message: 'Milestone created', statusCode: HttpStatus.CREATED };
  }

  @Patch(':milestoneId')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Update milestone' })
  async update(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    const data = await this.milestonesService.update(
      projectId,
      milestoneId,
      dto,
    );
    return { data, message: 'Milestone updated', statusCode: HttpStatus.OK };
  }

  @Patch(':milestoneId/complete')
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Mark milestone complete' })
  async complete(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.milestonesService.complete(
      projectId,
      milestoneId,
      user.sub,
    );
    return { data, message: 'Milestone completed', statusCode: HttpStatus.OK };
  }

  @Patch(':milestoneId/approve')
  @RequirePermission('projects.approvals', 'write')
  @ApiOperation({ summary: 'Approve milestone and trigger invoice' })
  async approve(
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: ApproveMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.milestonesService.approve(
      projectId,
      milestoneId,
      dto,
      user.sub,
    );
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Milestone approved', statusCode: HttpStatus.OK };
  }
}
