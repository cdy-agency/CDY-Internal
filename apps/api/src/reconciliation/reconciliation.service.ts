import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ExpenseCategory,
  ReconciliationStatus,
  TransactionMatchStatus,
} from '@prisma/client';
import { addDays, subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { CsvParserService } from './csv-parser.service';
import {
  ResolveTransactionDto,
  TransactionResolution,
} from './dto/resolve-transaction.dto';
import { ReconciliationFiltersDto } from './dto/reconciliation-filters.dto';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParserService: CsvParserService,
  ) {}

  async importStatement(file: Express.Multer.File, userId: string) {
    const transactions = this.csvParserService.parse(file.buffer);

    if (transactions.length === 0) {
      throw new BadRequestException('No transactions found in the uploaded file');
    }

    const sortedDates = transactions
      .map((t) => t.transactionDate)
      .sort((a, b) => a.getTime() - b.getTime());
    const periodFrom = sortedDates[0];
    const periodTo = sortedDates[sortedDates.length - 1];

    const first = transactions[0];
    const last = transactions[transactions.length - 1];
    const openingBalance =
      first.balance -
      (first.creditAmount ?? 0) +
      (first.debitAmount ?? 0);

    const statement = await this.prisma.bankStatement.create({
      data: {
        periodFrom,
        periodTo,
        importedBy: userId,
        openingBalance,
        closingBalance: last.balance,
        transactionCount: transactions.length,
        transactions: {
          create: transactions.map((t) => ({
            transactionDate: t.transactionDate,
            description: t.description,
            debitAmount: t.debitAmount,
            creditAmount: t.creditAmount,
            balance: t.balance,
            reference: t.reference,
          })),
        },
      },
      include: { transactions: true },
    });

    const matchResult = await this.autoMatch(statement.id);

    this.logger.log(
      `Imported statement ${statement.id}: ${transactions.length} transactions`,
    );

    return {
      statementId: statement.id,
      transactionCount: transactions.length,
      matchedCount: matchResult.matched,
      unmatchedCount: matchResult.unmatched,
      periodFrom: periodFrom.toISOString(),
      periodTo: periodTo.toISOString(),
    };
  }

  async findAll(filters: ReconciliationFiltersDto) {
    const statements = await this.prisma.bankStatement.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { importedAt: 'desc' },
    });

    return statements.map((s) => this.serializeStatement(s));
  }

  async findOne(id: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { transactionDate: 'asc' } },
      },
    });

    if (!statement) throw new NotFoundException('Statement not found');

    return {
      ...this.serializeStatement(statement),
      transactions: statement.transactions.map((tx) => this.serializeTransaction(tx)),
    };
  }

  async resolveTransaction(
    statementId: string,
    transactionId: string,
    dto: ResolveTransactionDto,
    userId: string,
  ) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, bankStatementId: statementId },
    });

    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.matchStatus !== TransactionMatchStatus.UNMATCHED) {
      throw new BadRequestException('Transaction is already resolved');
    }

    let matchedEntityType: string | null = null;
    let matchedEntityId: string | null = null;

    switch (dto.resolution) {
      case TransactionResolution.LINK_PAYMENT: {
        if (!dto.entityId) {
          throw new BadRequestException('entityId is required for LINK_PAYMENT');
        }
        const payment = await this.prisma.payment.findFirst({
          where: { id: dto.entityId, deletedAt: null },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        matchedEntityType = 'Payment';
        matchedEntityId = payment.id;
        break;
      }
      case TransactionResolution.LINK_EXPENSE: {
        if (!dto.entityId) {
          throw new BadRequestException('entityId is required for LINK_EXPENSE');
        }
        const expense = await this.prisma.expense.findFirst({
          where: { id: dto.entityId, deletedAt: null },
        });
        if (!expense) throw new NotFoundException('Expense not found');
        matchedEntityType = 'Expense';
        matchedEntityId = expense.id;
        break;
      }
      case TransactionResolution.CREATE_EXPENSE: {
        if (!dto.expenseData) {
          throw new BadRequestException('expenseData is required for CREATE_EXPENSE');
        }
        const expense = await this.prisma.expense.create({
          data: {
            vendorName: dto.expenseData.vendorName,
            category: dto.expenseData.category,
            amount: dto.expenseData.amount,
            date: new Date(dto.expenseData.date),
            notes: dto.expenseData.notes,
            createdBy: userId,
          },
        });
        matchedEntityType = 'Expense';
        matchedEntityId = expense.id;
        break;
      }
      case TransactionResolution.BANK_CHARGE: {
        const amount = Number(tx.debitAmount ?? 0);
        const expense = await this.prisma.expense.create({
          data: {
            vendorName: 'Bank',
            category: ExpenseCategory.OTHER,
            amount,
            date: tx.transactionDate,
            notes: `Bank charge: ${tx.description}`,
            createdBy: userId,
          },
        });
        matchedEntityType = 'Expense';
        matchedEntityId = expense.id;
        break;
      }
      case TransactionResolution.IGNORE:
        await this.prisma.bankTransaction.update({
          where: { id: transactionId },
          data: {
            matchStatus: TransactionMatchStatus.IGNORED,
            resolvedBy: userId,
            resolvedAt: new Date(),
            resolvedNote: dto.note ?? 'Ignored',
          },
        });
        await this.updateStatementCounts(statementId);
        return { message: 'Transaction ignored' };
      default:
        throw new BadRequestException('Invalid resolution type');
    }

    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        matchStatus: TransactionMatchStatus.MANUALLY_RESOLVED,
        matchedEntityType,
        matchedEntityId,
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolvedNote: dto.note,
      },
    });

    await this.updateStatementCounts(statementId);

    return { message: 'Transaction resolved', matchedEntityType, matchedEntityId };
  }

  async completeReconciliation(statementId: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { transactions: true },
    });

    if (!statement) throw new NotFoundException('Statement not found');

    const unresolved = statement.transactions.filter(
      (tx) => tx.matchStatus === TransactionMatchStatus.UNMATCHED,
    );

    if (unresolved.length > 0) {
      throw new BadRequestException(
        `${unresolved.length} transactions are still unmatched`,
      );
    }

    const resolvedTxs = statement.transactions.filter(
      (tx) =>
        tx.matchStatus === TransactionMatchStatus.MATCHED ||
        tx.matchStatus === TransactionMatchStatus.MANUALLY_RESOLVED,
    );

    const creditSum = resolvedTxs.reduce(
      (s, tx) => s + Number(tx.creditAmount ?? 0),
      0,
    );
    const debitSum = resolvedTxs.reduce(
      (s, tx) => s + Number(tx.debitAmount ?? 0),
      0,
    );

    const systemBalance =
      Number(statement.openingBalance) + creditSum - debitSum;
    const bankBalance = Number(statement.closingBalance);
    const difference = Number((systemBalance - bankBalance).toFixed(2));
    const hasDiscrepancy = Math.abs(difference) > 0.01;

    const status = hasDiscrepancy
      ? ReconciliationStatus.DISCREPANCY
      : ReconciliationStatus.COMPLETED;

    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Reconciliation ${statementId} completed: ${status}, diff=${difference}`,
    );

    return {
      status,
      systemBalance: Number(systemBalance.toFixed(2)),
      bankBalance: Number(bankBalance.toFixed(2)),
      difference,
    };
  }

  private async autoMatch(statementId: string) {
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        bankStatementId: statementId,
        matchStatus: TransactionMatchStatus.UNMATCHED,
      },
    });

    let matched = 0;
    let unmatched = 0;

    for (const tx of transactions) {
      let matchFound = false;

      if (tx.creditAmount) {
        const payment = await this.prisma.payment.findFirst({
          where: {
            amount: tx.creditAmount,
            paidAt: {
              gte: subDays(tx.transactionDate, 2),
              lte: addDays(tx.transactionDate, 2),
            },
            deletedAt: null,
          },
        });

        if (payment) {
          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: {
              matchStatus: TransactionMatchStatus.MATCHED,
              matchedEntityType: 'Payment',
              matchedEntityId: payment.id,
            },
          });
          matchFound = true;
        }
      }

      if (!matchFound && tx.debitAmount) {
        const expense = await this.prisma.expense.findFirst({
          where: {
            amount: tx.debitAmount,
            date: {
              gte: subDays(tx.transactionDate, 2),
              lte: addDays(tx.transactionDate, 2),
            },
            deletedAt: null,
          },
        });

        if (expense) {
          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: {
              matchStatus: TransactionMatchStatus.MATCHED,
              matchedEntityType: 'Expense',
              matchedEntityId: expense.id,
            },
          });
          matchFound = true;
        }
      }

      if (matchFound) matched++;
      else unmatched++;
    }

    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: { matchedCount: matched, unmatchedCount: unmatched },
    });

    return { matched, unmatched };
  }

  private async updateStatementCounts(statementId: string) {
    const [matched, unmatched] = await Promise.all([
      this.prisma.bankTransaction.count({
        where: {
          bankStatementId: statementId,
          matchStatus: {
            in: [
              TransactionMatchStatus.MATCHED,
              TransactionMatchStatus.MANUALLY_RESOLVED,
            ],
          },
        },
      }),
      this.prisma.bankTransaction.count({
        where: {
          bankStatementId: statementId,
          matchStatus: TransactionMatchStatus.UNMATCHED,
        },
      }),
    ]);

    await this.prisma.bankStatement.update({
      where: { id: statementId },
      data: { matchedCount: matched, unmatchedCount: unmatched },
    });
  }

  private serializeStatement(statement: {
    id: string;
    periodFrom: Date;
    periodTo: Date;
    importedAt: Date;
    importedBy: string;
    status: ReconciliationStatus;
    completedAt: Date | null;
    openingBalance: { toString(): string } | number;
    closingBalance: { toString(): string } | number;
    transactionCount: number;
    matchedCount: number;
    unmatchedCount: number;
  }) {
    return {
      id: statement.id,
      periodFrom: statement.periodFrom.toISOString(),
      periodTo: statement.periodTo.toISOString(),
      importedAt: statement.importedAt.toISOString(),
      importedBy: statement.importedBy,
      status: statement.status,
      completedAt: statement.completedAt?.toISOString() ?? null,
      openingBalance: Number(statement.openingBalance),
      closingBalance: Number(statement.closingBalance),
      transactionCount: statement.transactionCount,
      matchedCount: statement.matchedCount,
      unmatchedCount: statement.unmatchedCount,
    };
  }

  private serializeTransaction(tx: {
    id: string;
    transactionDate: Date;
    description: string;
    debitAmount: { toString(): string } | number | null;
    creditAmount: { toString(): string } | number | null;
    balance: { toString(): string } | number;
    reference: string | null;
    matchStatus: TransactionMatchStatus;
    matchedEntityType: string | null;
    matchedEntityId: string | null;
    resolvedNote: string | null;
  }) {
    return {
      id: tx.id,
      transactionDate: tx.transactionDate.toISOString(),
      description: tx.description,
      debitAmount: tx.debitAmount !== null ? Number(tx.debitAmount) : null,
      creditAmount: tx.creditAmount !== null ? Number(tx.creditAmount) : null,
      balance: Number(tx.balance),
      reference: tx.reference,
      matchStatus: tx.matchStatus,
      matchedEntityType: tx.matchedEntityType,
      matchedEntityId: tx.matchedEntityId,
      resolvedNote: tx.resolvedNote,
    };
  }
}
