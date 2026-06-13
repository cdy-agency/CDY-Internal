import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVentureExpenseDto } from './dto/create-venture-expense.dto';
import { VentureExpenseFiltersDto } from './dto/venture-expense-filters.dto';

@Injectable()
export class VentureExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ventureId: string,
    dto: CreateVentureExpenseDto,
    userId: string,
  ) {
    const venture = await this.prisma.venture.findUnique({
      where: { id: ventureId },
    });
    if (!venture) {
      throw new NotFoundException('Venture not found');
    }
    if (!venture.isActive) {
      throw new BadRequestException('Venture is inactive');
    }

    const ventureShare = dto.ventureShare;
    const cdyShare = dto.cdyShare ?? 0;
    if (dto.isShared && ventureShare + cdyShare > 100) {
      throw new BadRequestException(
        `Venture share (${ventureShare}%) + CDY share (${cdyShare}%) cannot exceed 100%`,
      );
    }

    const ventureAmount = Number(
      ((dto.totalAmount * ventureShare) / 100).toFixed(2),
    );

    const entry = await this.prisma.ventureExpense.create({
      data: {
        ventureId,
        description: dto.description,
        totalAmount: dto.totalAmount,
        ventureShare,
        ventureAmount,
        currency: dto.currency ?? 'USD',
        category: dto.category,
        date: new Date(dto.date),
        isShared: dto.isShared ?? false,
        cdyShare: dto.cdyShare,
        receiptUrl: dto.receiptUrl,
        notes: dto.notes,
        expenseId: dto.expenseId,
        createdBy: userId,
      },
    });

    return {
      ...entry,
      totalAmount: Number(entry.totalAmount),
      ventureShare: Number(entry.ventureShare),
      ventureAmount: Number(entry.ventureAmount),
      cdyShare: entry.cdyShare ? Number(entry.cdyShare) : null,
    };
  }

  async findAll(ventureId: string, filters: VentureExpenseFiltersDto) {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      dateFilter.gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const entries = await this.prisma.ventureExpense.findMany({
      where: {
        ventureId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isShared !== undefined && { isShared: filters.isShared }),
      },
      orderBy: { date: 'desc' },
    });

    return entries.map((e) => ({
      ...e,
      totalAmount: Number(e.totalAmount),
      ventureShare: Number(e.ventureShare),
      ventureAmount: Number(e.ventureAmount),
      cdyShare: e.cdyShare ? Number(e.cdyShare) : null,
    }));
  }

  async delete(id: string) {
    const entry = await this.prisma.ventureExpense.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Expense entry not found');
    }
    await this.prisma.ventureExpense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Expense entry deleted' };
  }
}
