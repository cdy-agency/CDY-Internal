import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVentureIncomeDto } from './dto/create-venture-income.dto';
import { VentureIncomeFiltersDto } from './dto/venture-income-filters.dto';

@Injectable()
export class VentureIncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ventureId: string, dto: CreateVentureIncomeDto, userId: string) {
    const venture = await this.prisma.venture.findUnique({
      where: { id: ventureId },
    });
    if (!venture) {
      throw new NotFoundException('Venture not found');
    }
    if (!venture.isActive) {
      throw new BadRequestException(
        'Cannot log income for an inactive venture',
      );
    }

    const entry = await this.prisma.ventureIncome.create({
      data: {
        ventureId,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        category: dto.category,
        date: new Date(dto.date),
        reference: dto.reference,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    return {
      ...entry,
      amount: Number(entry.amount),
    };
  }

  async findAll(ventureId: string, filters: VentureIncomeFiltersDto) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      dateFilter.gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const entries = await this.prisma.ventureIncome.findMany({
      where: {
        ventureId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(filters.category && { category: filters.category }),
      },
      orderBy: { date: 'desc' },
    });

    return entries.map((e) => ({
      ...e,
      amount: Number(e.amount),
    }));
  }

  async delete(id: string) {
    const entry = await this.prisma.ventureIncome.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Income entry not found');
    }
    await this.prisma.ventureIncome.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Income entry deleted' };
  }
}
