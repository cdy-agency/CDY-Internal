import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, userId: string) {
    return this.prisma.brandingSupplier.create({
      data: { ...dto, createdBy: userId },
    });
  }

  async findAll() {
    return this.prisma.brandingSupplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
