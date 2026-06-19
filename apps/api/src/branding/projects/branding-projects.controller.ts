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
  async findAll() {
    const data = await this.service.findAll();
    return { data, message: 'OK', statusCode: 200 };
  }

  @Post()
  @RequirePermission('branding.projects', 'write')
  async create(@Body() dto: CreateBrandingProjectDto, @Request() req: { user: { sub: string } }) {
    const data = await this.service.create(dto, req.user.sub);
    return { data, message: 'Branding project created', statusCode: 201 };
  }

  @Get(':id')
  @RequirePermission('branding.projects', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Patch(':id')
  @RequirePermission('branding.projects', 'write')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateBrandingProjectDto>) {
    const data = await this.service.addScopeItem(id, dto as CreateScopeItemDto);
    return { data, message: 'Project updated', statusCode: 200 };
  }

  @Post(':id/scope')
  @RequirePermission('branding.projects', 'write')
  async addScopeItem(
    @Param('id') id: string,
    @Body() dto: CreateScopeItemDto,
  ) {
    const data = await this.service.addScopeItem(id, dto);
    return { data, message: 'Scope item added', statusCode: 201 };
  }

  @Post(':id/deliver')
  @RequirePermission('branding.projects', 'write')
  async markDelivered(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    const data = await this.service.markDelivered(id, req.user.sub);
    return { data, message: 'Project marked delivered', statusCode: 200 };
  }
}
