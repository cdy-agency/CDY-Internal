import {
  Controller,
  Get,
  Patch,
  Body,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Get all finance settings' })
  async getAll() {
    const data = await this.settingsService.getAll();
    return { data, message: 'Settings retrieved', statusCode: HttpStatus.OK };
  }

  @Patch()
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
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
