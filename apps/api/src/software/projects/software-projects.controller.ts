import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SoftwareProjectsService } from './software-projects.service';
import {
  CreateSoftwareProjectDto,
  UpdateSoftwareProjectDto,
} from './dto/create-software-project.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects')
export class SoftwareProjectsController {
  constructor(
    private readonly softwareProjectsService: SoftwareProjectsService,
  ) {}

  @Get()
  @RequirePermission('software.projects', 'read')
  async findAll() {
    const data = await this.softwareProjectsService.findAll();
    return { data, statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('software.projects', 'write')
  async create(
    @Body() dto: CreateSoftwareProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.softwareProjectsService.create(dto, user.sub);
    return {
      data,
      message: 'Software project created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get(':id')
  @RequirePermission('software.projects', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.softwareProjectsService.findOne(id);
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('software.projects', 'write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSoftwareProjectDto,
  ) {
    const data = await this.softwareProjectsService.update(id, dto);
    return {
      data,
      message: 'Software project updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/advance')
  @RequirePermission('software.projects', 'write')
  async advancePhase(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.softwareProjectsService.advancePhase(id, user.sub);
    return {
      data,
      message: 'Phase advanced',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @RequirePermission('software.projects', 'write')
  @ApiOperation({ summary: 'Soft-delete software project' })
  async remove(@Param('id') id: string) {
    const data = await this.softwareProjectsService.remove(id);
    return {
      data,
      message: data.message,
      statusCode: HttpStatus.OK,
    };
  }
}
