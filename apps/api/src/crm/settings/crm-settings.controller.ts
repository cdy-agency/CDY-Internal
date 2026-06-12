import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { CrmSettingsService } from './crm-settings.service';
import { UpdateCrmSettingDto } from './dto/update-crm-setting.dto';

@ApiTags('crm-settings')
@ApiBearerAuth()
@Controller('crm/settings')
export class CrmSettingsController {
  constructor(private readonly crmSettingsService: CrmSettingsService) {}

  @Get()
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get all CRM settings' })
  async getAll() {
    const data = await this.crmSettingsService.getAll();
    return { data, message: 'Settings retrieved', statusCode: HttpStatus.OK };
  }

  @Get('lost-reasons')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Get preset lost reasons' })
  async getLostReasons() {
    const data = await this.crmSettingsService.getLostReasons();
    return { data, message: 'Lost reasons retrieved', statusCode: HttpStatus.OK };
  }

  @Patch()
  @RequirePermission('crm.reports', 'write')
  @ApiOperation({ summary: 'Update a CRM setting' })
  async update(
    @Body() dto: UpdateCrmSettingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.crmSettingsService.set(dto.key, dto.value, user.sub);
    const data = await this.crmSettingsService.getAll();
    return { data, message: 'Setting updated', statusCode: HttpStatus.OK };
  }
}
