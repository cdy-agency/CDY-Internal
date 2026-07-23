import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      headId: d.headId,
      employeeCount: d._count.employees,
      isActive: d.isActive,
    }));
  }

  /** Minimal picker results — id/name only */
  async lookup() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateDepartmentDto>) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async remove(id: string) {
    await this.findOne(id);

    const activeEmployees = await this.prisma.employee.count({
      where: { departmentId: id, status: { not: EmployeeStatus.TERMINATED } },
    });
    if (activeEmployees > 0) {
      throw new BadRequestException(
        'Cannot delete a department that still has active employees assigned. Reassign those employees first.',
      );
    }

    await this.prisma.department.delete({ where: { id } });
    return { message: 'Department deleted' };
  }
}
