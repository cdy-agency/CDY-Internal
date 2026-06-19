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
import { DeploymentService } from './deployment.service';
import {
  CreateDeploymentDto,
  CreateMaintenanceLogDto,
} from './dto/create-deployment.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';

@ApiTags('software')
@ApiBearerAuth()
@Controller('software/projects/:id')
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post('deploy')
  @RequirePermission('software.delivery', 'write')
  async deploy(
    @Param('id') softwareProjectId: string,
    @Body() dto: CreateDeploymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.deploymentService.deploy(
      softwareProjectId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Project deployed successfully',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('deployment')
  @RequirePermission('software.delivery', 'read')
  async findDeployment(@Param('id') softwareProjectId: string) {
    const data = await this.deploymentService.findDeployment(softwareProjectId);
    return { data, statusCode: HttpStatus.OK };
  }

  @Post('maintenance')
  @RequirePermission('software.delivery', 'write')
  async logMaintenanceIssue(
    @Param('id') softwareProjectId: string,
    @Body() dto: CreateMaintenanceLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.deploymentService.logMaintenanceIssue(
      softwareProjectId,
      dto,
      user.sub,
    );
    return { data, message: 'Issue logged', statusCode: HttpStatus.CREATED };
  }

  @Get('maintenance')
  @RequirePermission('software.delivery', 'read')
  async findMaintenanceLogs(@Param('id') softwareProjectId: string) {
    const data =
      await this.deploymentService.findMaintenanceLogs(softwareProjectId);
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch('maintenance/:logId/resolve')
  @RequirePermission('software.delivery', 'write')
  async resolveMaintenanceIssue(@Param('logId') logId: string) {
    const data = await this.deploymentService.resolveMaintenanceIssue(logId);
    return { data, message: 'Issue resolved', statusCode: HttpStatus.OK };
  }
}
