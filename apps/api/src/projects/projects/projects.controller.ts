import {
  Body,
  Controller,
  Delete,
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
import { ProjectsService } from './projects.service';
import { ProjectsSummaryService } from '../summary/projects-summary.service';
import { TasksService } from '../tasks/tasks.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFiltersDto } from './dto/project-filters.dto';
import { AddProjectMembersDto } from './dto/add-project-members.dto';
import { CompleteProjectDto } from './dto/complete-project.dto';
import { ProjectActivityService } from '../activity/project-activity.service';
import { WorkloadFiltersDto } from '../approvals/approval.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectsSummaryService: ProjectsSummaryService,
    private readonly tasksService: TasksService,
    private readonly projectActivityService: ProjectActivityService,
  ) {}

  @Get('summary')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Projects dashboard summary' })
  async getSummary() {
    const data = await this.projectsSummaryService.getSummary();
    return { data, message: 'Summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get('tasks/my')
  @RequirePermission('projects.own', 'read')
  @ApiOperation({ summary: 'My assigned tasks across projects' })
  async getMyTasks(@CurrentUser() user: JwtPayload) {
    const data = await this.tasksService.findMyTasks(user.sub);
    return { data, message: 'Tasks retrieved', statusCode: HttpStatus.OK };
  }

  @Get('my')
  @RequirePermission('projects.own', 'read')
  @ApiOperation({ summary: 'My projects' })
  async findMy(@CurrentUser() user: JwtPayload) {
    const data = await this.projectsService.findMyProjects(user.sub);
    return { data, message: 'Projects retrieved', statusCode: HttpStatus.OK };
  }

  @Get('workload')
  @RequirePermission('projects.reports', 'read')
  @ApiOperation({ summary: 'Team workload across active projects' })
  async getWorkload(@Query() filters: WorkloadFiltersDto) {
    const data = await this.projectsService.getTeamWorkload(filters);
    return { data, message: 'Workload retrieved', statusCode: HttpStatus.OK };
  }

  @Get()
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'List projects' })
  async findAll(
    @Query() filters: ProjectFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.findAll(filters, {
      id: user.sub,
      roleKey: user.roleKey,
    });
    return { data, message: 'Projects retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Create project' })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.create(dto, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project created', statusCode: HttpStatus.CREATED };
  }

  @Get(':id')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.projectsService.findOne(id);
    return { data, message: 'Project retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.update(id, dto, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project updated', statusCode: HttpStatus.OK };
  }

  @Get(':id/activity')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Project activity feed' })
  async getActivity(@Param('id') id: string) {
    const data = await this.projectActivityService.getProjectFeed(id);
    return { data, message: 'Activity retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id/status-report')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Generate project status report' })
  async getStatusReport(@Param('id') id: string) {
    const data = await this.projectsService.generateStatusReport(id);
    return { data, message: 'Status report generated', statusCode: HttpStatus.OK };
  }

  @Get(':id/progress')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Project progress' })
  async getProgress(@Param('id') id: string) {
    const data = await this.projectsService.getProgress(id);
    return { data, message: 'Progress retrieved', statusCode: HttpStatus.OK };
  }

  @Post(':id/members')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Add project members' })
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddProjectMembersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.addMembers(id, dto.employeeIds, user.sub);
    return { data, message: 'Members added', statusCode: HttpStatus.OK };
  }

  @Delete(':id/members/:employeeId')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Remove project member' })
  async removeMember(
    @Param('id') id: string,
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.removeMember(id, employeeId, user.sub);
    return { data, message: 'Member removed', statusCode: HttpStatus.OK };
  }

  @Patch(':id/complete')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Mark project complete' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.complete(id, dto, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project completed', statusCode: HttpStatus.OK };
  }

  @Patch(':id/on-hold')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Put project on hold' })
  async onHold(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.projectsService.onHold(id, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project on hold', statusCode: HttpStatus.OK };
  }

  @Patch(':id/reactivate')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Reactivate project' })
  async reactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.projectsService.reactivate(id, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project reactivated', statusCode: HttpStatus.OK };
  }

  @Post(':id/handover-report')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Generate handover report' })
  async generateHandover(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.projectsService.generateHandoverReport(id, user.sub);
    return { data, message: 'Handover report generated', statusCode: HttpStatus.CREATED };
  }

  @Get(':id/handover-report')
  @RequirePermission('projects.all', 'read')
  @ApiOperation({ summary: 'Get latest handover report' })
  async getHandover(@Param('id') id: string) {
    const data = await this.projectsService.getHandoverReport(id);
    return { data, message: 'Handover report retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id/archive')
  @RequirePermission('projects.all', 'write')
  @ApiOperation({ summary: 'Archive project' })
  async archive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.projectsService.archive(id, user.sub);
    await this.projectsSummaryService.invalidateSummaryCache();
    return { data, message: 'Project archived', statusCode: HttpStatus.OK };
  }
}
