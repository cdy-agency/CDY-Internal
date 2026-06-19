import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { BrandingProjectsService } from './branding-projects.service';
import { CreateBrandingProjectDto } from './dto/create-branding-project.dto';
import { CreateScopeItemDto } from './dto/create-scope-item.dto';

@Controller('branding/projects')
export class BrandingProjectsController {
  constructor(private readonly service: BrandingProjectsService) {}

  @Get()
  @RequirePermission('branding.projects', 'read')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermission('branding.projects', 'write')
  create(@Body() dto: CreateBrandingProjectDto, @Request() req: { user: { sub: string } }) {
    return this.service.create(dto, req.user.sub);
  }

  @Get(':id')
  @RequirePermission('branding.projects', 'read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('branding.projects', 'write')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBrandingProjectDto>) {
    return this.service.addScopeItem(id, dto as CreateScopeItemDto);
  }

  @Post(':id/scope')
  @RequirePermission('branding.projects', 'write')
  addScopeItem(
    @Param('id') id: string,
    @Body() dto: CreateScopeItemDto,
  ) {
    return this.service.addScopeItem(id, dto);
  }

  @Post(':id/deliver')
  @RequirePermission('branding.projects', 'write')
  markDelivered(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.service.markDelivered(id, req.user.sub);
  }
}
