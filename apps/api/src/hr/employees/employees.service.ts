import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RbacService } from '../../rbac/rbac.service';
import { CacheService } from '../../cache/cache.service';
import { AuditContext } from '../../common/audit/audit.context';
import { EmployeeCodeService } from './employee-code.service';
import { LeaveBalanceService } from '../leave/leave-balance.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { HrAuditService } from '../audit/hr-audit.service';
import { HrSummaryService } from '../hr-summary.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFiltersDto } from './dto/employee-filters.dto';
import { TerminateEmployeeDto } from './dto/terminate-employee.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly employeeCodeService: EmployeeCodeService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly onboardingService: OnboardingService,
    private readonly hrAuditService: HrAuditService,
    private readonly hrSummaryService: HrSummaryService,
    private readonly cacheService: CacheService,
  ) {}

  async create(dto: CreateEmployeeDto, userId: string, auditCtx?: AuditContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User account not found');

    const existing = await this.prisma.employee.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        'An employee record already exists for this user',
      );
    }

    const employeeCode = await this.employeeCodeService.generate();

    const employee = await this.prisma.employee.create({
      data: {
        userId: dto.userId,
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        profilePhotoUrl: dto.profilePhotoUrl,
        jobTitle: dto.jobTitle,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        employmentType: dto.employmentType,
        startDate: new Date(dto.startDate),
        baseSalary: dto.baseSalary,
        currency: dto.currency ?? 'RWF',
        salaryEffectiveFrom: dto.salaryEffectiveFrom
          ? new Date(dto.salaryEffectiveFrom)
          : new Date(),
        nationalId: dto.nationalId,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        notes: dto.notes,
        createdBy: userId,
      },
      include: { department: true },
    });

    await this.leaveBalanceService.initialiseForEmployee(employee.id);
    await this.onboardingService.initialise(employee.id, employee.startDate);

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'employee.created',
        entityType: 'Employee',
        entityId: employee.id,
        newValue: {
          employeeCode: employee.employeeCode,
          email: employee.email,
        },
        ipAddress: auditCtx.ipAddress,
      });
    }

    return this.serializeEmployee(employee);
  }

  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true, deletedAt: true },
    });
    if (!employee || employee.deletedAt) return null;
    return employee.id;
  }

  async requireEmployeeIdByUserId(userId: string): Promise<string> {
    const id = await this.findEmployeeIdByUserId(userId);
    if (!id) throw new NotFoundException('Employee profile not found');
    return id;
  }

  async findAll(
    filters: EmployeeFiltersDto,
    requestingUser: { id: string },
  ) {
    // Sensitive fields are exposed only to users whose role grants the
    // hr.employees.sensitive feature (capability-based, not role-key based).
    const canSeeSensitive = await this.rbac.can(
      requestingUser.id,
      'hr.employees.sensitive',
      'read',
    );

    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        status: filters.status ?? { not: EmployeeStatus.TERMINATED },
        ...(filters.departmentId && { departmentId: filters.departmentId }),
        ...(filters.search && {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { jobTitle: { contains: filters.search, mode: 'insensitive' } },
            { employeeCode: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        department: { select: { id: true, name: true } },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ department: { name: 'asc' } }, { firstName: 'asc' }],
    });

    if (!canSeeSensitive) {
      return employees.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        jobTitle: e.jobTitle,
        email: e.email,
        phone: e.phone,
        departmentName: e.department?.name ?? null,
        profilePhotoUrl: e.profilePhotoUrl,
        status: e.status,
      }));
    }

    return employees.map((e) => this.serializeEmployee(e));
  }

  async findOne(id: string, requestingUserId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        managedEmployees: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const canSeeSensitive = requestingUserId
      ? await this.rbac.can(requestingUserId, 'hr.employees.sensitive', 'read')
      : false;
    return this.serializeEmployee(employee, canSeeSensitive);
  }

  async findByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        department: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!employee || employee.deletedAt) {
      throw new NotFoundException('Employee profile not found');
    }
    return this.serializeEmployee(employee, false);
  }

  async update(id: string, dto: UpdateEmployeeDto, auditCtx?: AuditContext) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.profilePhotoUrl !== undefined && {
          profilePhotoUrl: dto.profilePhotoUrl,
        }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.departmentId !== undefined && {
          departmentId: dto.departmentId,
        }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
        ...(dto.employmentType !== undefined && {
          employmentType: dto.employmentType,
        }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.baseSalary !== undefined && { baseSalary: dto.baseSalary }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.salaryEffectiveFrom !== undefined && {
          salaryEffectiveFrom: new Date(dto.salaryEffectiveFrom),
        }),
        ...(dto.nationalId !== undefined && { nationalId: dto.nationalId }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.bankAccount !== undefined && { bankAccount: dto.bankAccount }),
        ...(dto.emergencyContactName !== undefined && {
          emergencyContactName: dto.emergencyContactName,
        }),
        ...(dto.emergencyContactPhone !== undefined && {
          emergencyContactPhone: dto.emergencyContactPhone,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { department: true },
    });

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'employee.updated',
        entityType: 'Employee',
        entityId: id,
        previousValue: { jobTitle: existing.jobTitle, status: existing.status },
        newValue: { jobTitle: employee.jobTitle, status: employee.status },
        ipAddress: auditCtx.ipAddress,
      });
    }

    await this.hrSummaryService.invalidateSummaryCache();
    return this.serializeEmployee(employee);
  }

  async updateOwnProfile(userId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');

    const allowed: UpdateEmployeeDto = {
      phone: dto.phone,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone,
      profilePhotoUrl: dto.profilePhotoUrl,
    };

    return this.update(employee.id, allowed);
  }

  async terminate(
    id: string,
    dto: TerminateEmployeeDto,
    auditCtx?: AuditContext,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.status === EmployeeStatus.TERMINATED) {
      throw new BadRequestException('Employee is already terminated');
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status: EmployeeStatus.TERMINATED,
        endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        notes: dto.reason
          ? `${employee.notes ?? ''}\n[Termination] ${dto.reason}`.trim()
          : employee.notes,
      },
      include: { department: true },
    });

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'employee.terminated',
        entityType: 'Employee',
        entityId: id,
        previousValue: { status: employee.status },
        newValue: { status: EmployeeStatus.TERMINATED, endDate: updated.endDate },
        ipAddress: auditCtx.ipAddress,
      });
    }

    await this.hrSummaryService.invalidateSummaryCache();
    return this.serializeEmployee(updated);
  }

  async remove(id: string, auditCtx?: AuditContext) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const activeReports = await this.prisma.employee.count({
      where: { managerId: id },
    });
    if (activeReports > 0) {
      throw new BadRequestException(
        'Cannot delete an employee who is still the manager of active direct reports. Reassign those reports first.',
      );
    }

    await this.prisma.employee.delete({ where: { id } });

    if (auditCtx) {
      this.hrAuditService.log({
        userId: auditCtx.userId,
        userEmail: auditCtx.userEmail,
        action: 'employee.deleted',
        entityType: 'Employee',
        entityId: id,
        previousValue: {
          employeeCode: employee.employeeCode,
          email: employee.email,
        },
        ipAddress: auditCtx.ipAddress,
      });
    }

    await this.hrSummaryService.invalidateSummaryCache();
    return { message: 'Employee deleted' };
  }

  async updateSalary(
    employeeId: string,
    dto: UpdateSalaryDto,
    userId: string,
    auditCtx: AuditContext,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const previous = {
      baseSalary: Number(employee.baseSalary),
      currency: employee.currency,
    };

    await this.prisma.salaryHistory.create({
      data: {
        employeeId,
        previousSalary: employee.baseSalary,
        newSalary: dto.newSalary,
        currency: dto.currency ?? employee.currency,
        effectiveFrom: new Date(dto.effectiveFrom),
        reason: dto.reason,
        changedBy: userId,
      },
    });

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        baseSalary: dto.newSalary,
        currency: dto.currency ?? employee.currency,
        salaryEffectiveFrom: new Date(dto.effectiveFrom),
      },
      include: { department: true },
    });

    this.hrAuditService.log({
      userId: auditCtx.userId,
      userEmail: auditCtx.userEmail,
      action: 'salary.updated',
      entityType: 'Employee',
      entityId: employeeId,
      previousValue: previous,
      newValue: {
        baseSalary: dto.newSalary,
        effectiveFrom: dto.effectiveFrom,
      },
      ipAddress: auditCtx.ipAddress,
    });

    await this.hrSummaryService.invalidateSummaryCache();
    await this.cacheService.del('hr:summary');

    return this.serializeEmployee(updated);
  }

  async getSalaryHistory(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const history = await this.prisma.salaryHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      current: {
        baseSalary: Number(employee.baseSalary),
        currency: employee.currency,
        effectiveFrom: employee.salaryEffectiveFrom.toISOString(),
      },
      history: history.map((h) => ({
        id: h.id,
        previousSalary: Number(h.previousSalary),
        newSalary: Number(h.newSalary),
        currency: h.currency,
        effectiveFrom: h.effectiveFrom.toISOString(),
        reason: h.reason,
        changedBy: h.changedBy,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  async findUsersWithoutEmployeeRecord() {
    const employees = await this.prisma.employee.findMany({
      select: { userId: true },
    });
    const linkedIds = new Set(employees.map((e) => e.userId));

    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users.filter((u) => !linkedIds.has(u.id));
  }

  private serializeEmployee(
    employee: {
      id: string;
      userId: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      profilePhotoUrl: string | null;
      jobTitle: string;
      departmentId: string | null;
      managerId: string | null;
      employmentType: string;
      status: string;
      startDate: Date;
      endDate: Date | null;
      baseSalary: { toString(): string } | number;
      currency: string;
      salaryEffectiveFrom: Date;
      nationalId?: string | null;
      bankName?: string | null;
      bankAccount?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      notes?: string | null;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      department?: { id: string; name: string } | null;
      manager?: { id: string; firstName: string; lastName: string } | null;
      managedEmployees?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        jobTitle: string;
      }>;
    },
    includeSensitive = true,
  ) {
    const base = {
      id: employee.id,
      userId: employee.userId,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      profilePhotoUrl: employee.profilePhotoUrl,
      jobTitle: employee.jobTitle,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name ?? null,
      managerId: employee.managerId,
      managerName: employee.manager
        ? `${employee.manager.firstName} ${employee.manager.lastName}`
        : null,
      employmentType: employee.employmentType,
      status: employee.status,
      startDate: employee.startDate.toISOString(),
      endDate: employee.endDate?.toISOString() ?? null,
      currency: employee.currency,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      directReports: employee.managedEmployees ?? [],
    };

    if (!includeSensitive) return base;

    return {
      ...base,
      baseSalary: Number(employee.baseSalary),
      salaryEffectiveFrom: employee.salaryEffectiveFrom.toISOString(),
      nationalId: employee.nationalId ?? null,
      bankName: employee.bankName ?? null,
      bankAccount: employee.bankAccount ?? null,
      emergencyContactName: employee.emergencyContactName ?? null,
      emergencyContactPhone: employee.emergencyContactPhone ?? null,
      notes: employee.notes ?? null,
      createdBy: employee.createdBy,
    };
  }
}
