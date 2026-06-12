import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { TimeService } from './time.service';
import { CreateTimeEntryDto } from '../tasks/dto/task.dto';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('project-time')
@ApiBearerAuth()
@Controller('projects/:projectId/time')
export class TimeController {
  constructor(private readonly timeService: TimeService) {}

  @Post()
  @RequirePermission('projects.time', 'write')
  @ApiOperation({ summary: 'Log time entry' })
  async logTime(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.timeService.logTime(
      { ...dto, projectId },
      user.sub,
    );
    return { data, message: 'Time logged', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('projects.time', 'read')
  @ApiOperation({ summary: 'List time entries' })
  async findAll(@Param('projectId') projectId: string) {
    const data = await this.timeService.findByProject(projectId);
    return { data, message: 'Time entries retrieved', statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @RequirePermission('projects.time', 'read')
  @ApiOperation({ summary: 'Time summary for project' })
  async getSummary(@Param('projectId') projectId: string) {
    const data = await this.timeService.getProjectSummary(projectId);
    return { data, message: 'Time summary retrieved', statusCode: HttpStatus.OK };
  }
}
