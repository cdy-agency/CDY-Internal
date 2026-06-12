import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { SavedFiltersService } from './saved-filters.service';
import { SaveFilterDto } from './dto/save-filter.dto';

@ApiTags('crm-filters')
@ApiBearerAuth()
@Controller('crm/filters')
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Get()
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'List saved filters for current user' })
  async findMy(
    @Query('module') module: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.savedFiltersService.findMy(user.sub, module);
    return { data, message: 'Filters retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Save a filter preset' })
  async save(@Body() dto: SaveFilterDto, @CurrentUser() user: JwtPayload) {
    const data = await this.savedFiltersService.save(
      user.sub,
      dto.module,
      dto.name,
      dto.filters,
    );
    return { data, message: 'Filter saved', statusCode: HttpStatus.CREATED };
  }

  @Delete(':id')
  @RequirePermission('crm.leads', 'read')
  @ApiOperation({ summary: 'Delete a saved filter' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.savedFiltersService.delete(id, user.sub);
    return { data, message: 'Filter deleted', statusCode: HttpStatus.OK };
  }
}
