import {
  Controller,
  Get,
  Patch,
  Body,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission('finance.settings', 'read')
  @ApiOperation({ summary: 'Get all finance settings' })
  async getAll() {
    const data = await this.settingsService.getAll();
    return { data, message: 'Settings retrieved', statusCode: HttpStatus.OK };
  }

  @Patch()
  @RequirePermission('finance.settings', 'write')
  @ApiOperation({ summary: 'Update a finance setting' })
  async update(
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.settingsService.set(dto.key, dto.value, user.sub);
    const data = await this.settingsService.getAll();
    return { data, message: 'Setting updated', statusCode: HttpStatus.OK };
  }
}
