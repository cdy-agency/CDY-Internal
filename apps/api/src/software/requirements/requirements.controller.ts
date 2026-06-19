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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDocDto } from './dto/create-requirement-doc.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects/:id/requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  @RequirePermission('software.delivery', 'read')
  async findAll(@Param('id') softwareProjectId: string) {
    const data = await this.requirementsService.findByProject(softwareProjectId);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('software.delivery', 'write')
  async create(
    @Param('id') softwareProjectId: string,
    @Body() dto: CreateRequirementDocDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.requirementsService.create(
      softwareProjectId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Requirement document created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch(':docId/send')
  @RequirePermission('software.delivery', 'write')
  async sendToClient(@Param('docId') docId: string) {
    const data = await this.requirementsService.sendToClient(docId);
    return { data, message: 'Sent to client', statusCode: HttpStatus.OK };
  }

  @Patch(':docId/sign')
  @RequirePermission('software.delivery', 'write')
  async markSigned(@Param('docId') docId: string) {
    const data = await this.requirementsService.markSigned(docId);
    return { data, message: 'Marked as signed', statusCode: HttpStatus.OK };
  }

  @Patch(':docId/revise')
  @RequirePermission('software.delivery', 'write')
  async markRevised(@Param('docId') docId: string) {
    const data = await this.requirementsService.markRevised(docId);
    return { data, message: 'Marked for revision', statusCode: HttpStatus.OK };
  }
}
