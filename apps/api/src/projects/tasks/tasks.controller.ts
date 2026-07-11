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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import { DeliverableApprovalService } from '../approvals/deliverable-approval.service';
import { RequestApprovalDto } from '../approvals/approval.dto';
import {
  CreateTaskCommentDto,
  CreateTaskDto,
  TaskFiltersDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';

@ApiTags('project-tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly deliverableApprovalService: DeliverableApprovalService,
  ) {}

  @Get()
  @RequirePermission('projects.tasks', 'read')
  @ApiOperation({ summary: 'List project tasks' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query() filters: TaskFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.tasksService.findByProject(projectId, filters, {
      id: user.sub,
    });
    return { data, message: 'Tasks retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Create task' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.tasksService.create(
      { ...dto, projectId },
      user.sub,
    );
    return { data, message: 'Task created', statusCode: HttpStatus.CREATED };
  }

  @Post('import')
  @RequirePermission('projects.tasks', 'write')
  @UseInterceptors(FileInterceptor('tasks', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Import tasks from CSV' })
  async importCsv(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file?.buffer) {
      return {
        data: { imported: 0, errors: ['CSV file is required'] },
        message: 'Import failed',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
    const data = await this.tasksService.importFromCsv(
      projectId,
      file.buffer,
      user.sub,
    );
    return { data, message: 'Import complete', statusCode: HttpStatus.OK };
  }

  @Get(':taskId')
  @RequirePermission('projects.tasks', 'read')
  @ApiOperation({ summary: 'Get task detail' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    const data = await this.tasksService.findOne(projectId, taskId);
    return { data, message: 'Task retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':taskId')
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Update task' })
  async update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.tasksService.update(
      projectId,
      taskId,
      dto,
      user.sub,
    );
    return { data, message: 'Task updated', statusCode: HttpStatus.OK };
  }

  @Patch(':taskId/status')
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.tasksService.updateStatus(
      projectId,
      taskId,
      dto,
      user.sub,
    );
    return { data, message: 'Status updated', statusCode: HttpStatus.OK };
  }

  @Delete(':taskId')
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Delete task' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.tasksService.softDelete(projectId, taskId);
    return { data: null, message: 'Task deleted', statusCode: HttpStatus.OK };
  }

  @Post(':taskId/comments')
  @RequirePermission('projects.tasks', 'write')
  @ApiOperation({ summary: 'Add task comment' })
  async addComment(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.tasksService.addComment(
      projectId,
      taskId,
      dto,
      user.sub,
    );
    return { data, message: 'Comment added', statusCode: HttpStatus.CREATED };
  }

  @Post(':taskId/approvals')
  @RequirePermission('projects.approvals', 'write')
  @ApiOperation({ summary: 'Request deliverable approval' })
  async requestApproval(
    @Param('projectId') _projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: RequestApprovalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.deliverableApprovalService.request(
      taskId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Approval requested',
      statusCode: HttpStatus.CREATED,
    };
  }
}
