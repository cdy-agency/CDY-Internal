import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import {
  CreateDevSprintDto,
  CreateSprintItemDto,
  UpdateItemStatusDto,
} from './dto/create-dev-sprint.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects/:id/sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  @RequirePermission('software.delivery', 'read')
  async findAll(@Param('id') softwareProjectId: string) {
    const data = await this.sprintsService.findByProject(softwareProjectId);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('software.delivery', 'write')
  async create(
    @Param('id') softwareProjectId: string,
    @Body() dto: CreateDevSprintDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.sprintsService.create(
      softwareProjectId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Sprint created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch(':sprintId/start')
  @RequirePermission('software.delivery', 'write')
  async startSprint(@Param('sprintId') sprintId: string) {
    const data = await this.sprintsService.startSprint(sprintId);
    return { data, message: 'Sprint started', statusCode: HttpStatus.OK };
  }

  @Patch(':sprintId/complete')
  @RequirePermission('software.delivery', 'write')
  async completeSprint(@Param('sprintId') sprintId: string) {
    const data = await this.sprintsService.completeSprint(sprintId);
    return { data, message: 'Sprint completed', statusCode: HttpStatus.OK };
  }

  @Post(':sprintId/items')
  @RequirePermission('software.delivery', 'write')
  async addItem(
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateSprintItemDto,
  ) {
    const data = await this.sprintsService.addItem(sprintId, dto);
    return { data, message: 'Item added', statusCode: HttpStatus.CREATED };
  }

  @Patch(':sprintId/items/:itemId/status')
  @RequirePermission('software.delivery', 'write')
  async updateItemStatus(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    const data = await this.sprintsService.updateItemStatus(itemId, dto.status);
    return { data, message: 'Item status updated', statusCode: HttpStatus.OK };
  }
}
