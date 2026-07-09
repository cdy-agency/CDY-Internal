import { Body, Controller, Delete, Get, Param, Post, Request } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Controller('branding/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermission('branding.projects', 'read')
  async findAll() {
    const data = await this.service.findAll();
    return { data, message: 'OK', statusCode: 200 };
  }

  @Post()
  @RequirePermission('branding.projects', 'write')
  async create(
    @Body() dto: CreateSupplierDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.service.create(dto, req.user.sub);
    return { data, message: 'Supplier created', statusCode: 201 };
  }

  @Delete(':id')
  @RequirePermission('branding.projects', 'write')
  @ApiOperation({ summary: 'Soft-delete branding supplier' })
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(id);
    return { data, message: data.message, statusCode: 200 };
  }
}
