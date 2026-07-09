import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, NotificationType } from '@prisma/client';
import { format } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { LeaveBalanceService } from './leave-balance.service';
import { HrAuditService } from '../audit/hr-audit.service';
import { AuditContext } from '../../common/audit/audit.context';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { LeaveFiltersDto } from './dto/leave-filters.dto';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly notificationsService: NotificationsService,
    private readonly hrAuditService: HrAuditService,
  ) {}

  private calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  async submitRequest(
    employeeId: string,
    dto: CreateLeaveRequestDto,
    _userId: string,
  ) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const totalDays = this.calculateWorkingDays(start, end);
    if (totalDays === 0) {
      throw new BadRequestException(
        'Leave request must include at least one working day',
      );
    }

    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    if (leaveType.defaultDaysPerYear > 0) {
      const balance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId: dto.leaveTypeId,
            year: start.getFullYear(),
          },
        },
      });

      if (balance && Number(balance.remaining) < totalDays) {
        throw new BadRequestException(
          `Insufficient leave balance. Requested: ${totalDays} days. Available: ${Number(balance.remaining)} days.`,
        );
      }
    }

    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `You have an overlapping leave request (${format(overlap.startDate, 'MMM d')} – ${format(overlap.endDate, 'MMM d, yyyy')})`,
      );
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason: dto.reason,
        documentUrl: dto.documentUrl,
      },
      include: {
        leaveType: true,
        employee: { include: { manager: true } },
      },
    });

    await this.leaveBalanceService.recalculate(
      employeeId,
      dto.leaveTypeId,
      start.getFullYear(),
    );

    if (request.employee.managerId && request.employee.manager) {
      const managerUser = await this.prisma.employee.findUnique({
        where: { id: request.employee.managerId },
        select: { userId: true },
      });
      if (managerUser) {
        await this.notificationsService.createNotification({
          userId: managerUser.userId,
          type: NotificationType.SYSTEM,
          title: `Leave request — ${request.employee.firstName} ${request.employee.lastName}`,
          body: `${leaveType.name}: ${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')} (${totalDays} days)`,
          link: `/hr/leave/${request.id}`,
        });
      }
    }

    return request;
  }

  async reviewRequest(
    id: string,
    dto: ReviewLeaveRequestDto,
    reviewerEmployeeId: string,
    auditCtx?: AuditContext,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });

    if (!request) throw new NotFoundException('Leave request not found');

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Leave request is already ${request.status.toLowerCase()}`,
      );
    }

    if (dto.action === 'REJECT' && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status:
          dto.action === 'APPROVE'
            ? LeaveStatus.APPROVED
            : LeaveStatus.REJECTED,
        reviewedBy: reviewerEmployeeId,
        reviewedAt: new Date(),
        ...(dto.rejectionReason && { rejectionReason: dto.rejectionReason }),
      },
      include: { employee: true, leaveType: true },
    });

    await this.leaveBalanceService.recalculate(
      request.employeeId,
      request.leaveTypeId,
      request.startDate.getFullYear(),
    );

    await this.notificationsService.createNotification({
      userId: updated.employee.userId,
      type: NotificationType.SYSTEM,
      title: `Leave request ${dto.action === 'APPROVE' ? 'approved' : 'rejected'}`,
      body:
        dto.action === 'APPROVE'
          ? `Your ${updated.leaveType.name} request has been approved.`
          : `Your ${updated.leaveType.name} request was rejected. Reason: ${dto.rejectionReason}`,
      link: `/hr/leave/${id}`,
    });

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: dto.action === 'APPROVE' ? 'leave.approved' : 'leave.rejected',
        entityType: 'LeaveRequest',
        entityId: id,
        newValue: { status: updated.status },
        ipAddress: auditCtx.ipAddress,
      });
    }

    return updated;
  }

  async cancelRequest(id: string, employeeId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, employeeId },
    });
    if (!request) throw new NotFoundException('Leave request not found');

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: { leaveType: true },
    });

    await this.leaveBalanceService.recalculate(
      employeeId,
      request.leaveTypeId,
      request.startDate.getFullYear(),
    );

    return updated;
  }

  async findAll(filters: LeaveFiltersDto) {
    return this.prisma.leaveRequest.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            departmentId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyRequests(employeeId: string) {
    return this.findAll({ employeeId });
  }

  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            userId: true,
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    return request;
  }

  async findLeaveTypes() {
    return this.prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createLeaveType(data: {
    name: string;
    code: string;
    defaultDaysPerYear: number;
    isPaid: boolean;
    requiresApproval: boolean;
    requiresDocument: boolean;
  }) {
    return this.prisma.leaveType.create({ data });
  }

  async updateLeaveType(
    id: string,
    data: Partial<{
      name: string;
      defaultDaysPerYear: number;
      isPaid: boolean;
      requiresApproval: boolean;
      requiresDocument: boolean;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.leaveType.update({ where: { id }, data });
  }

  async deleteLeaveType(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    await this.prisma.leaveType.delete({ where: { id } });
    return { message: 'Leave type deleted' };
  }

  async deleteRequest(id: string, auditCtx?: AuditContext) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Leave request not found');

    await this.prisma.leaveRequest.delete({ where: { id } });

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'leave.deleted',
        entityType: 'LeaveRequest',
        entityId: id,
        previousValue: { status: request.status },
        ipAddress: auditCtx.ipAddress,
      });
    }

    return { message: 'Leave request deleted' };
  }
}
