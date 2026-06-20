import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  BudgetRequestStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { BudgetIncreaseRequestDto } from './dto/budget-increase-request.dto';
import {
  BudgetReviewAction,
  ReviewBudgetRequestDto,
} from './dto/review-budget-request.dto';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createBudget(dto: CreateProjectBudgetDto, userId: string) {
    const existing = await this.prisma.projectBudget.findUnique({
      where: { projectId: dto.projectId },
    });
    if (existing) {
      throw new BadRequestException(
        `A budget already exists for project ${dto.projectId}`,
      );
    }

    const budget = await this.prisma.projectBudget.create({
      data: {
        projectId: dto.projectId,
        projectName: dto.projectName,
        clientId: dto.clientId,
        approvedBudget: dto.approvedBudget,
        currency: dto.currency ?? 'RWF',
        alertThresholdPct: dto.alertThresholdPct ?? 80,
        createdBy: userId,
      },
    });

    return this.serializeBudget(budget);
  }

  async findAll() {
    const budgets = await this.prisma.projectBudget.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const statuses = await Promise.all(
      budgets.map((b) => this.getBudgetStatus(b.projectId)),
    );

    return statuses;
  }

  async getBudgetStatus(projectId: string) {
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        increaseRequests: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!budget) {
      throw new NotFoundException(`No budget found for project ${projectId}`);
    }

    const expenseAggregate = await this.prisma.expense.aggregate({
      where: { projectId, deletedAt: null },
      _sum: { amount: true },
    });

    const totalCosts = Number(expenseAggregate._sum.amount ?? 0);
    const approvedBudget = Number(budget.approvedBudget);
    const remainingBudget = approvedBudget - totalCosts;
    const percentConsumed =
      approvedBudget > 0
        ? Number(((totalCosts / approvedBudget) * 100).toFixed(2))
        : 0;

    const projectedFinalCost = totalCosts;

    const expenses = await this.prisma.expense.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return {
      projectId,
      projectName: budget.projectName,
      clientId: budget.clientId,
      currency: budget.currency,
      approvedBudget,
      totalCosts: Number(totalCosts.toFixed(2)),
      remainingBudget: Number(remainingBudget.toFixed(2)),
      percentConsumed,
      projectedFinalCost: Number(projectedFinalCost.toFixed(2)),
      isOverBudget: totalCosts > approvedBudget,
      isBlocked: budget.isBlocked,
      alertThresholdPct: budget.alertThresholdPct,
      pendingRequest: (() => {
        const pending = budget.increaseRequests.find(
          (r) => r.status === BudgetRequestStatus.PENDING,
        );
        return pending ? this.serializeIncreaseRequest(pending) : null;
      })(),
      expenses: expenses.map((e) => ({
        id: e.id,
        vendorName: e.vendorName,
        category: e.category,
        amount: Number(e.amount),
        date: e.date.toISOString(),
      })),
    };
  }

  async checkBudgetAlerts() {
    const budgets = await this.prisma.projectBudget.findMany({
      where: { isBlocked: false },
    });

    let alertCount = 0;

    for (const budget of budgets) {
      const status = await this.getBudgetStatus(budget.projectId);

      const shouldAlert =
        status.percentConsumed >= budget.alertThresholdPct &&
        (!budget.alertSentAt ||
          budget.alertSentAt < subDays(new Date(), 7));

      if (shouldAlert) {
        this.notificationsService.createForRoleAsync(
          'OPERATIONS_MANAGER',
          {
            type: NotificationType.BUDGET_ALERT,
            title: `Budget alert — ${budget.projectName}`,
            body: `Project "${budget.projectName}" has consumed ${status.percentConsumed}% of its $${status.approvedBudget} budget.`,
            link: `/finance/budget/${budget.projectId}`,
          },
        );

        await this.prisma.projectBudget.update({
          where: { id: budget.id },
          data: { alertSentAt: new Date() },
        });
        alertCount++;
      }

      if (status.isOverBudget && !budget.isBlocked) {
        await this.prisma.projectBudget.update({
          where: { id: budget.id },
          data: { isBlocked: true },
        });
      }
    }

    this.logger.log(`Budget alerts: ${alertCount} notifications sent`);
    return alertCount;
  }

  async requestBudgetIncrease(
    projectId: string,
    dto: BudgetIncreaseRequestDto,
    userId: string,
    requesterName?: string,
  ) {
    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
      include: {
        increaseRequests: {
          where: { status: BudgetRequestStatus.PENDING },
        },
      },
    });

    if (!budget) throw new NotFoundException();

    if (budget.increaseRequests.length > 0) {
      throw new BadRequestException(
        'A budget increase request is already pending for this project',
      );
    }

    if (dto.requestedBudget <= Number(budget.approvedBudget)) {
      throw new BadRequestException(
        'Requested budget must be greater than the current approved budget',
      );
    }

    const request = await this.prisma.budgetIncreaseRequest.create({
      data: {
        projectId,
        currentBudget: budget.approvedBudget,
        requestedBudget: dto.requestedBudget,
        justification: dto.justification,
        requestedBy: userId,
      },
    });

    this.notificationsService.createForRoleAsync('OPERATIONS_MANAGER', {
      type: NotificationType.BUDGET_ALERT,
      title: `Budget increase request — ${budget.projectName}`,
      body: `${requesterName ?? 'A team member'} is requesting a budget increase from $${Number(budget.approvedBudget).toFixed(2)} to $${dto.requestedBudget.toFixed(2)}. Justification: ${dto.justification}`,
      link: `/finance/budget/${projectId}`,
    });

    return this.serializeIncreaseRequest(request);
  }

  async findPendingIncreaseRequests() {
    const requests = await this.prisma.budgetIncreaseRequest.findMany({
      where: { status: BudgetRequestStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const budgets = await this.prisma.projectBudget.findMany({
      where: { projectId: { in: requests.map((r) => r.projectId) } },
    });
    const budgetMap = Object.fromEntries(
      budgets.map((b) => [b.projectId, b]),
    );

    return requests.map((r) => ({
      ...this.serializeIncreaseRequest(r),
      projectName: budgetMap[r.projectId]?.projectName ?? r.projectId,
    }));
  }

  async reviewBudgetRequest(
    requestId: string,
    dto: ReviewBudgetRequestDto,
    userId: string,
  ) {
    const request = await this.prisma.budgetIncreaseRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException();
    if (request.status !== BudgetRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId: request.projectId },
    });

    if (dto.action === BudgetReviewAction.APPROVE) {
      await this.prisma.$transaction([
        this.prisma.projectBudget.update({
          where: { projectId: request.projectId },
          data: {
            approvedBudget: request.requestedBudget,
            isBlocked: false,
          },
        }),
        this.prisma.budgetIncreaseRequest.update({
          where: { id: requestId },
          data: {
            status: BudgetRequestStatus.APPROVED,
            reviewedBy: userId,
            reviewedAt: new Date(),
          },
        }),
      ]);

      this.notificationsService.createNotificationAsync({
        userId: request.requestedBy,
        type: NotificationType.SYSTEM,
        title: `Budget increase approved — ${budget?.projectName ?? request.projectId}`,
        body: `Your budget increase request to $${Number(request.requestedBudget).toFixed(2)} has been approved. Expense logging is now unblocked.`,
        link: `/finance/budget/${request.projectId}`,
      });
    } else {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException('Rejection reason is required');
      }

      await this.prisma.budgetIncreaseRequest.update({
        where: { id: requestId },
        data: {
          status: BudgetRequestStatus.REJECTED,
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
      });

      this.notificationsService.createNotificationAsync({
        userId: request.requestedBy,
        type: NotificationType.SYSTEM,
        title: `Budget increase rejected — ${budget?.projectName ?? request.projectId}`,
        body: `Your budget increase request was rejected. Reason: ${dto.rejectionReason}`,
        link: `/finance/budget/${request.projectId}`,
      });
    }

    return this.serializeIncreaseRequest(
      (await this.prisma.budgetIncreaseRequest.findUnique({
        where: { id: requestId },
      }))!,
    );
  }

  private serializeBudget(budget: {
    id: string;
    projectId: string;
    projectName: string;
    clientId: string;
    approvedBudget: Prisma.Decimal;
    currency: string;
    alertThresholdPct: number;
    isBlocked: boolean;
    createdAt: Date;
  }) {
    return {
      id: budget.id,
      projectId: budget.projectId,
      projectName: budget.projectName,
      clientId: budget.clientId,
      approvedBudget: Number(budget.approvedBudget),
      currency: budget.currency,
      alertThresholdPct: budget.alertThresholdPct,
      isBlocked: budget.isBlocked,
      createdAt: budget.createdAt.toISOString(),
    };
  }

  private serializeIncreaseRequest(request: {
    id: string;
    projectId: string;
    currentBudget: Prisma.Decimal;
    requestedBudget: Prisma.Decimal;
    justification: string;
    requestedBy: string;
    status: BudgetRequestStatus;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
  }) {
    return {
      id: request.id,
      projectId: request.projectId,
      currentBudget: Number(request.currentBudget),
      requestedBudget: Number(request.requestedBudget),
      justification: request.justification,
      requestedBy: request.requestedBy,
      status: request.status,
      reviewedBy: request.reviewedBy,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt.toISOString(),
    };
  }
}
