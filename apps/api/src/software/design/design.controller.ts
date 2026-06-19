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
import { DesignService } from './design.service';
import { UpdateDesignPhaseDto } from './dto/update-design-phase.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects/:id/design')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  @Get()
  @RequirePermission('software.delivery', 'read')
  async getOrCreate(
    @Param('id') softwareProjectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.designService.getOrCreate(
      softwareProjectId,
      user.sub,
    );
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch()
  @RequirePermission('software.delivery', 'write')
  async update(
    @Param('id') softwareProjectId: string,
    @Body() dto: UpdateDesignPhaseDto,
  ) {
    const data = await this.designService.update(softwareProjectId, dto);
    return { data, message: 'Design phase updated', statusCode: HttpStatus.OK };
  }

  @Post('skip')
  @RequirePermission('software.delivery', 'write')
  async skip(@Param('id') softwareProjectId: string) {
    const data = await this.designService.skip(softwareProjectId);
    return { data, message: 'Design phase skipped', statusCode: HttpStatus.OK };
  }

  @Post('approve')
  @RequirePermission('software.delivery', 'write')
  async approve(@Param('id') softwareProjectId: string) {
    const data = await this.designService.approve(softwareProjectId);
    return { data, message: 'Design approved', statusCode: HttpStatus.OK };
  }

  @Post('changes')
  @RequirePermission('software.delivery', 'write')
  async requestChanges(@Param('id') softwareProjectId: string) {
    const data = await this.designService.requestChanges(softwareProjectId);
    return {
      data,
      message: 'Changes requested',
      statusCode: HttpStatus.OK,
    };
  }
}
