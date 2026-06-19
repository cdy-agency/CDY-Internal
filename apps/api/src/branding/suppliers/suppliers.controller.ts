import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Controller('branding/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermission('branding.projects', 'read')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermission('branding.projects', 'write')
  create(
    @Body() dto: CreateSupplierDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.create(dto, req.user.sub);
  }
}
