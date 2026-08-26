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
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../common/cache-keys';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly cacheService: CacheService,
  ) {}

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

    // The CEO summary caches for 60s — bust it immediately so a toggle here
    // is reflected on the dashboard right away instead of after the TTL.
    if (dto.key.startsWith('exclude_old_data')) {
      await this.cacheService.del(CacheKeys.CEO_SUMMARY);
    }

    const data = await this.settingsService.getAll();
    return { data, message: 'Setting updated', statusCode: HttpStatus.OK };
  }
}
