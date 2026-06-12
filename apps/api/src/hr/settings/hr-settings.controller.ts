import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { HrSettingsService } from './hr-settings.service';

@ApiTags('hr-settings')
@ApiBearerAuth()
@Controller('hr/settings')
export class HrSettingsController {
  constructor(private readonly hrSettingsService: HrSettingsService) {}

  @Get()
  @RequirePermission('hr.settings', 'read')
  @ApiOperation({ summary: 'Get all HR settings' })
  async getAll() {
    const data = await this.hrSettingsService.getAll();
    return { data, message: 'Settings retrieved', statusCode: HttpStatus.OK };
  }

  @Patch()
  @RequirePermission('hr.settings', 'write')
  @ApiOperation({ summary: 'Update HR setting' })
  async update(
    @Body() dto: { key: string; value: string },
    @CurrentUser() user: JwtPayload,
  ) {
    await this.hrSettingsService.set(dto.key, dto.value, user.sub);
    const data = await this.hrSettingsService.getAll();
    return { data, message: 'Setting updated', statusCode: HttpStatus.OK };
  }
}
