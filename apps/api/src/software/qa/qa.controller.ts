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
import { QaService } from './qa.service';
import { CreateBugDto, UpdateBugStatusDto } from './dto/create-bug.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects/:id/qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Get()
  @RequirePermission('software.delivery', 'read')
  async getOrCreate(
    @Param('id') softwareProjectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.qaService.getOrCreate(softwareProjectId, user.sub);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post('skip')
  @RequirePermission('software.delivery', 'write')
  async skip(@Param('id') softwareProjectId: string) {
    const data = await this.qaService.skip(softwareProjectId);
    return { data, message: 'QA phase skipped', statusCode: HttpStatus.OK };
  }

  @Post('bugs')
  @RequirePermission('software.delivery', 'write')
  async logBug(
    @Param('id') softwareProjectId: string,
    @Body() dto: CreateBugDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.qaService.logBug(softwareProjectId, dto, user.sub);
    return { data, message: 'Bug logged', statusCode: HttpStatus.CREATED };
  }

  @Patch('bugs/:bugId/status')
  @RequirePermission('software.delivery', 'write')
  async updateBugStatus(
    @Param('bugId') bugId: string,
    @Body() dto: UpdateBugStatusDto,
  ) {
    const data = await this.qaService.updateBugStatus(bugId, dto.status);
    return { data, message: 'Bug status updated', statusCode: HttpStatus.OK };
  }

  @Post('complete')
  @RequirePermission('software.delivery', 'write')
  async complete(@Param('id') softwareProjectId: string) {
    const data = await this.qaService.complete(softwareProjectId);
    return { data, message: 'QA phase completed', statusCode: HttpStatus.OK };
  }

  @Delete('bugs/:bugId')
  @RequirePermission('software.delivery', 'write')
  @ApiOperation({ summary: 'Soft-delete bug' })
  async removeBug(@Param('bugId') bugId: string) {
    const data = await this.qaService.removeBug(bugId);
    return { data, message: data.message, statusCode: HttpStatus.OK };
  }
}
