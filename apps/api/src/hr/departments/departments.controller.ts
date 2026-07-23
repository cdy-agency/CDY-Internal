import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@ApiTags('hr-departments')
@ApiBearerAuth()
@Controller('hr/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'List departments' })
  async findAll() {
    const data = await this.departmentsService.findAll();
    return { data, message: 'Departments retrieved', statusCode: HttpStatus.OK };
  }

  @Get('lookup')
  @RequirePermission('hr.departments.lookup', 'read')
  @ApiOperation({ summary: 'Lookup departments for pickers (id/name only)' })
  async lookup() {
    const data = await this.departmentsService.lookup();
    return { data, message: 'Departments found', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Create department' })
  async create(@Body() dto: CreateDepartmentDto) {
    const data = await this.departmentsService.create(dto);
    return { data, message: 'Department created', statusCode: HttpStatus.CREATED };
  }

  @Patch(':id')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Update department' })
  async update(@Param('id') id: string, @Body() dto: CreateDepartmentDto) {
    const data = await this.departmentsService.update(id, dto);
    return { data, message: 'Department updated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Soft-delete department' })
  async remove(@Param('id') id: string) {
    const data = await this.departmentsService.remove(id);
    return { data, message: 'Department deleted', statusCode: HttpStatus.OK };
  }
}
