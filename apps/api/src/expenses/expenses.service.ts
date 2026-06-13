import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { Role } from '@cdy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from './file-upload.service';
import { AuditService } from '../audit/audit.service';
import { AuditContext } from '../common/audit/audit.context';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFiltersDto } from './dto/expense-filters.dto';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileUploadService: FileUploadService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateExpenseDto,
    userId: string,
    auditCtx: AuditContext,
    file?: Express.Multer.File,
  ) {
    let receiptUrl: string | undefined;
    let uploadPath: string | undefined;

    if (file) {
      const upload = this.fileUploadService.upload(file);
      receiptUrl = upload.url;
      uploadPath = upload.path;
    }

    if (dto.projectId) {
      const budget = await this.prisma.projectBudget.findUnique({
        where: { projectId: dto.projectId },
      });

      if (budget?.isBlocked) {
        throw new BadRequestException(
          `Project "${budget.projectName}" is over budget and expense logging is blocked. Submit a budget increase request to continue.`,
        );
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        vendorName: dto.vendorName,
        category: dto.category,
        amount: dto.amount,
        currency: dto.currency ?? 'USD',
        date: new Date(dto.date),
        projectId: dto.projectId,
        notes: dto.notes,
        receiptUrl,
        uploadPath,
        createdBy: userId,
      },
    });

    const serialized = this.serialize(expense);
    this.auditService.log({
      ...auditCtx,
      action: 'expense.created',
      entityType: 'Expense',
      entityId: expense.id,
      newValue: serialized,
    });

    return serialized;
  }

  async findAll(filters: ExpenseFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = { deletedAt: null };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (filters.ventureId === 'cdy-main') {
      const linked = await this.prisma.ventureExpense.findMany({
        where: { expenseId: { not: null }, deletedAt: null },
        select: { expenseId: true },
      });
      const linkedIds = linked
        .map((l) => l.expenseId)
        .filter((id): id is string => id !== null);
      if (linkedIds.length > 0) {
        where.id = { notIn: linkedIds };
      }
    } else if (filters.ventureId) {
      const linked = await this.prisma.ventureExpense.findMany({
        where: {
          ventureId: filters.ventureId,
          expenseId: { not: null },
          deletedAt: null,
        },
        select: { expenseId: true },
      });
      const linkedIds = linked
        .map((l) => l.expenseId)
        .filter((id): id is string => id !== null);
      where.id = { in: linkedIds.length > 0 ? linkedIds : ['__none__'] };
    }

    const [expenses, total, categoryCounts] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { deletedAt: null, date: where.date },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthTotal = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: { deletedAt: null, date: { gte: monthStart } },
    });

    const topCategory = categoryCounts.sort(
      (a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0),
    )[0];

    return {
      data: expenses.map((e) => this.serialize(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        thisMonthTotal: Number(monthTotal._sum.amount ?? 0),
        topCategory: topCategory?.category ?? null,
        topCategoryAmount: Number(topCategory?._sum.amount ?? 0),
        categoryCounts: categoryCounts.map((c) => ({
          category: c.category,
          count: c._count,
        })),
      },
    };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.serialize(expense);
  }

  async update(id: string, dto: UpdateExpenseDto, auditCtx: AuditContext) {
    const existing = await this.getOrThrow(id);
    this.assertEditWindow(existing.createdAt);

    if (
      existing.createdBy === auditCtx.userId &&
      auditCtx.userRoleKey === Role.FINANCE_MANAGER
    ) {
      this.auditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'expense.self_edit_blocked',
        entityType: 'Expense',
        entityId: existing.id,
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
      throw new ForbiddenException(
        'Finance managers cannot edit their own expense records. Contact the Operations Manager.',
      );
    }

    const before = this.serialize(existing);

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.vendorName !== undefined && { vendorName: dto.vendorName }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    const serialized = this.serialize(expense);
    this.auditService.log({
      ...auditCtx,
      action: 'expense.updated',
      entityType: 'Expense',
      entityId: id,
      previousValue: before,
      newValue: serialized,
    });

    return serialized;
  }

  async softDelete(id: string): Promise<{ message: string }> {
    await this.getOrThrow(id);
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Expense deleted' };
  }

  private assertEditWindow(createdAt: Date): void {
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed > EDIT_WINDOW_MS) {
      throw new BadRequestException(
        'Expenses can only be edited within 24 hours of creation',
      );
    }
  }

  private async getOrThrow(id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  private serialize(expense: {
    id: string;
    vendorName: string;
    category: ExpenseCategory;
    amount: Prisma.Decimal;
    currency: string;
    date: Date;
    projectId: string | null;
    receiptUrl: string | null;
    uploadPath: string | null;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...expense,
      amount: Number(expense.amount),
      canEdit: Date.now() - expense.createdAt.getTime() <= EDIT_WINDOW_MS,
    };
  }
}
