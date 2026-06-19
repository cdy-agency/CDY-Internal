import { Body, Controller, Get, Post, Request } from '@nestjs/common';
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
}
