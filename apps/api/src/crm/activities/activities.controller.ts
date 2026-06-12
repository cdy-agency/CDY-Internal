import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';

function toActor(user: JwtPayload) {
  return { userId: user.sub, userEmail: user.email };
}

@ApiTags('crm-activities')
@ApiBearerAuth()
@Controller('crm/leads/:leadId/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Log lead activity' })
  async create(
    @Param('leadId') leadId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.activitiesService.create(
      leadId,
      dto,
      user.sub,
      user.roleKey,
      toActor(user),
    );
    return { data, message: 'Activity logged', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'List lead activities' })
  async findAll(
    @Param('leadId') leadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.activitiesService.findAll(
      leadId,
      user.sub,
      user.roleKey,
    );
    return { data, message: 'Activities retrieved', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('crm.leads', 'write')
  @ApiOperation({ summary: 'Delete lead activity' })
  async remove(
    @Param('leadId') leadId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.activitiesService.remove(
      leadId,
      id,
      user.sub,
      user.roleKey,
    );
    return { data, message: 'Activity deleted', statusCode: HttpStatus.OK };
  }
}
