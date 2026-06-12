import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { HrAuditService } from '../audit/hr-audit.service';
import { AuditContext } from '../../common/audit/audit.context';
import {
  CompleteReviewDto,
  CreatePerformanceReviewDto,
  SelfAssessmentDto,
} from './dto/performance-review.dto';

@Injectable()
export class PerformanceReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly hrAuditService: HrAuditService,
  ) {}

  async create(
    dto: CreatePerformanceReviewDto,
    auditCtx: AuditContext,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.performanceReview.findFirst({
      where: { employeeId: dto.employeeId, period: dto.period },
    });
    if (existing) {
      throw new ConflictException(
        `A review for ${dto.period} already exists for this employee`,
      );
    }

    const review = await this.prisma.performanceReview.create({
      data: {
        employeeId: dto.employeeId,
        reviewerId: dto.reviewerId,
        period: dto.period,
        reviewDate: new Date(dto.reviewDate),
        status: ReviewStatus.DRAFT,
        goalsSet: dto.goalsSet as Prisma.InputJsonValue | undefined,
        nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            userId: true,
          },
        },
      },
    });

    await this.notificationsService.createNotification({
      userId: review.employee.userId,
      type: NotificationType.SYSTEM,
      title: `Performance review — ${dto.period}`,
      body: 'Your manager has initiated your quarterly performance review. Please complete your self-assessment.',
      link: `/hr/performance/${review.id}`,
    });

    this.hrAuditService.log({
      userId: auditCtx.userId,
      userEmail: auditCtx.userEmail,
      action: 'review.created',
      entityType: 'PerformanceReview',
      entityId: review.id,
      newValue: { employeeId: dto.employeeId, period: dto.period },
      ipAddress: auditCtx.ipAddress,
    });

    return this.serializeReview(review);
  }

  async findAll(filters?: { employeeId?: string; period?: string }) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: {
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
        ...(filters?.period && { period: filters.period }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            departmentId: true,
          },
        },
      },
      orderBy: { reviewDate: 'desc' },
    });
    return reviews.map((r) => this.serializeReview(r));
  }

  async findOne(id: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            userId: true,
            departmentId: true,
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Performance review not found');
    return this.serializeReview(review);
  }

  async findOneAccessible(
    id: string,
    userId: string,
    canReadAll: boolean,
  ) {
    const review = await this.findOne(id);
    if (canReadAll) return review;

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) throw new ForbiddenException('Access denied');

    if (
      review.employeeId !== employee.id &&
      review.reviewerId !== employee.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    return review;
  }

  async getByEmployee(employeeId: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { reviewDate: 'desc' },
    });
    return reviews.map((r) => this.serializeReview(r));
  }

  async getMyReviews(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
    });
    if (!employee) return [];
    return this.getByEmployee(employee.id);
  }

  async getPendingReviews(reviewerId: string) {
    const reviews = await this.prisma.performanceReview.findMany({
      where: {
        reviewerId,
        status: { in: [ReviewStatus.DRAFT, ReviewStatus.MANAGER_REVIEW] },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { reviewDate: 'asc' },
    });
    return reviews.map((r) => this.serializeReview(r));
  }

  async submitSelfAssessment(
    id: string,
    dto: SelfAssessmentDto,
    employeeId: string,
  ) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: {
        employee: { select: { userId: true } },
      },
    });
    if (!review) throw new NotFoundException('Performance review not found');

    if (review.employeeId !== employeeId) {
      throw new ForbiddenException('You can only submit your own self-assessment');
    }

    if (
      review.status !== ReviewStatus.DRAFT &&
      review.status !== ReviewStatus.SELF_ASSESSMENT
    ) {
      throw new BadRequestException(
        'Self-assessment cannot be submitted at this stage',
      );
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        selfAssessment: dto.selfAssessment,
        selfRating: dto.selfRating,
        status: ReviewStatus.MANAGER_REVIEW,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            userId: true,
          },
        },
      },
    });

    const reviewer = await this.prisma.employee.findUnique({
      where: { id: review.reviewerId },
      select: { userId: true },
    });
    if (reviewer) {
      await this.notificationsService.createNotification({
        userId: reviewer.userId,
        type: NotificationType.SYSTEM,
        title: `Self-assessment submitted — ${review.period}`,
        body: `${updated.employee.firstName} ${updated.employee.lastName} has submitted their self-assessment for ${review.period}.`,
        link: `/hr/performance/${id}`,
      });
    }

    return this.serializeReview(updated);
  }

  async completeReview(
    id: string,
    dto: CompleteReviewDto,
    auditCtx: AuditContext,
  ) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            userId: true,
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Performance review not found');

    if (review.status !== ReviewStatus.MANAGER_REVIEW) {
      throw new BadRequestException(
        'Review can only be completed after the employee has submitted their self-assessment',
      );
    }

    if (!dto.overallRating || dto.overallRating < 1 || dto.overallRating > 5) {
      throw new BadRequestException('Overall rating must be between 1 and 5');
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        managerNotes: dto.managerNotes,
        overallRating: dto.overallRating,
        strengths: dto.strengths,
        improvements: dto.improvements,
        nextPeriodGoals: dto.nextPeriodGoals as Prisma.InputJsonValue | undefined,
        nextReviewDate: dto.nextReviewDate ? new Date(dto.nextReviewDate) : null,
        status: ReviewStatus.ACKNOWLEDGED,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            userId: true,
          },
        },
      },
    });

    await this.notificationsService.createNotification({
      userId: updated.employee.userId,
      type: NotificationType.SYSTEM,
      title: `Review ready — ${review.period}`,
      body: `Your ${review.period} performance review is ready. Overall rating: ${dto.overallRating}/5. Please acknowledge.`,
      link: `/hr/performance/${id}`,
    });

    this.hrAuditService.log({
      userId: auditCtx.userId,
      userEmail: auditCtx.userEmail,
      action: 'review.completed',
      entityType: 'PerformanceReview',
      entityId: id,
      newValue: { overallRating: dto.overallRating, period: review.period },
      ipAddress: auditCtx.ipAddress,
    });

    return this.serializeReview(updated);
  }

  async acknowledge(id: string, employeeId: string) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('Performance review not found');
    if (review.employeeId !== employeeId) {
      throw new ForbiddenException('You can only acknowledge your own review');
    }
    if (review.status !== ReviewStatus.ACKNOWLEDGED) {
      throw new BadRequestException('Review is not ready for acknowledgement');
    }

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
        status: ReviewStatus.COMPLETED,
      },
    });
    return this.serializeReview(updated);
  }

  private serializeReview(
    review: Prisma.PerformanceReviewGetPayload<{
      include: {
        employee: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            jobTitle: true;
            userId?: true;
            departmentId?: true;
          };
        };
      };
    }> | Prisma.PerformanceReviewGetPayload<object>,
  ) {
    const withEmployee = review as Prisma.PerformanceReviewGetPayload<{
      include: { employee: { select: { id: true; firstName: true; lastName: true; jobTitle: true; userId: true } } };
    }>;

    return {
      id: review.id,
      employeeId: review.employeeId,
      reviewerId: review.reviewerId,
      period: review.period,
      reviewDate: review.reviewDate.toISOString(),
      status: review.status,
      goalsSet: review.goalsSet,
      selfAssessment: review.selfAssessment,
      selfRating: review.selfRating,
      managerNotes: review.managerNotes,
      overallRating: review.overallRating,
      strengths: review.strengths,
      improvements: review.improvements,
      nextPeriodGoals: review.nextPeriodGoals,
      acknowledgedAt: review.acknowledgedAt?.toISOString() ?? null,
      nextReviewDate: review.nextReviewDate?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      employee: withEmployee.employee
        ? {
            id: withEmployee.employee.id,
            firstName: withEmployee.employee.firstName,
            lastName: withEmployee.employee.lastName,
            jobTitle: withEmployee.employee.jobTitle,
          }
        : undefined,
    };
  }
}
