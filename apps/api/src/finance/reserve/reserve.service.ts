import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseCategory, ReserveType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class ReserveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAccount() {
    const account = await this.prisma.reserveAccount.findFirst({
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!account) throw new NotFoundException('Reserve account not found');
    return account;
  }

  async deposit(dto: DepositDto, userId: string, userEmail: string) {
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.reserveAccount.findFirst();
      if (!account) throw new NotFoundException('Reserve account not found');

      const newBalance = Number(account.balance) + Number(dto.amount);

      await tx.reserveAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.reserveTransaction.create({
        data: {
          reserveAccountId: account.id,
          type: ReserveType.DEPOSIT,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description,
          reference: dto.reference,
          createdBy: userId,
        },
      });

      await tx.expense.create({
        data: {
          vendorName: 'Reserve Fund',
          category: ExpenseCategory.OTHER,
          amount: dto.amount,
          currency: account.currency,
          date: new Date(),
          notes: `Reserve fund deposit: ${dto.description}`,
          createdBy: userId,
        },
      });

      this.auditService.log({
        userId,
        userEmail,
        action: 'reserve.deposit',
        entityType: 'ReserveAccount',
        entityId: account.id,
        newValue: {
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description,
        },
      });

      return transaction;
    });
  }

  async withdraw(dto: WithdrawDto, userId: string, userEmail: string) {
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.reserveAccount.findFirst();
      if (!account) throw new NotFoundException('Reserve account not found');

      if (Number(dto.amount) > Number(account.balance)) {
        throw new BadRequestException(
          `Insufficient reserve balance. ` +
            `Available: ${account.currency} ${Number(account.balance).toLocaleString()}. ` +
            `Requested: ${account.currency} ${Number(dto.amount).toLocaleString()}.`,
        );
      }

      const newBalance = Number(account.balance) - Number(dto.amount);

      await tx.reserveAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.reserveTransaction.create({
        data: {
          reserveAccountId: account.id,
          type: ReserveType.WITHDRAWAL,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description,
          reference: dto.reference,
          createdBy: userId,
        },
      });

      this.auditService.log({
        userId,
        userEmail,
        action: 'reserve.withdrawal',
        entityType: 'ReserveAccount',
        entityId: account.id,
        newValue: {
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description,
        },
      });

      if (newBalance < 100000) {
        this.notificationsService.createForRoleAsync('CEO', {
          type: 'SYSTEM',
          title: 'Reserve balance low',
          body:
            `Reserve balance is now ${account.currency} ${newBalance.toLocaleString()}. ` +
            `Consider topping up.`,
          link: '/finance/reserve',
        });
      }

      return transaction;
    });
  }

  async getTransactions(filters?: {
    type?: ReserveType;
    from?: string;
    to?: string;
  }) {
    const account = await this.prisma.reserveAccount.findFirst();
    if (!account) throw new NotFoundException('Reserve account not found');

    return this.prisma.reserveTransaction.findMany({
      where: {
        reserveAccountId: account.id,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.from && { createdAt: { gte: new Date(filters.from) } }),
        ...(filters?.to && { createdAt: { lte: new Date(filters.to) } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMonthlySummary() {
    const account = await this.prisma.reserveAccount.findFirst();
    if (!account) {
      return { balance: 0, currency: 'RWF', depositsThisMonth: 0, withdrawalsThisMonth: 0 };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [deposits, withdrawals] = await Promise.all([
      this.prisma.reserveTransaction.aggregate({
        where: {
          reserveAccountId: account.id,
          type: ReserveType.DEPOSIT,
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.reserveTransaction.aggregate({
        where: {
          reserveAccountId: account.id,
          type: ReserveType.WITHDRAWAL,
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      balance: Number(account.balance),
      currency: account.currency,
      depositsThisMonth: Number(deposits._sum.amount ?? 0),
      withdrawalsThisMonth: Number(withdrawals._sum.amount ?? 0),
    };
  }
}
