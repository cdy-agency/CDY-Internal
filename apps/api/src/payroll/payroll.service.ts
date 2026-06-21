import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  CommissionStatus,
  EmployeeStatus,
  ExpenseCategory,
  PayrollRun,
  PayrollStatus,
  Prisma,
} from '@prisma/client';
import { format, parse } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { PayslipPdfService } from './payslip-pdf.service';
import { PayslipEmailService } from './payslip-email.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { AdjustLineItemDto } from './dto/adjust-line-item.dto';
import {
  CreateEmployeeSalaryDto,
  UpdateEmployeeSalaryDto,
} from './dto/create-employee-salary.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly settingsService: SettingsService,
    private readonly payslipPdfService: PayslipPdfService,
    private readonly payslipEmailService: PayslipEmailService,
  ) {}

  async createRun(dto: CreatePayrollRunDto, userId: string): Promise<PayrollRun> {
    const { month } = dto;

    const existing = await this.prisma.payrollRun.findUnique({
      where: { month },
    });
    if (existing) {
      throw new BadRequestException(
        `A payroll run for ${month} already exists with status ${existing.status}`,
      );
    }

    const salaries = await this.getActivePayrollSalaries(month);

    if (salaries.length === 0) {
      throw new BadRequestException(
        'No active employee salaries found. Add employee salaries before running payroll.',
      );
    }

    const commissions = await this.prisma.commissionRecord.findMany({
      where: { month, status: CommissionStatus.APPROVED },
    });

    const commissionByAgent = commissions.reduce<Record<string, number>>(
      (acc, c) => {
        const amount = Number(c.adjustedAmount ?? c.calculatedAmount);
        acc[c.agentId] = (acc[c.agentId] ?? 0) + amount;
        return acc;
      },
      {},
    );

    const taxRateSetting = await this.settingsService.get('payroll_tax_rate');
    const taxRate = taxRateSetting ? Number(taxRateSetting) / 100 : 0.2;

    const lineItemsData = salaries.map((salary) => {
      const base = Number(salary.baseSalary);
      const commission = commissionByAgent[salary.employeeId] ?? 0;
      const bonus = 0;
      const gross = base + commission + bonus;
      const taxDeduction = Number((gross * taxRate).toFixed(2));
      const netPay = gross - taxDeduction;

      return {
        employeeId: salary.employeeId,
        employeeName: salary.employeeName,
        employeeEmail: salary.employeeEmail,
        baseSalary: base,
        commission,
        bonus,
        grossPay: gross,
        taxDeduction,
        otherDeductions: 0,
        netPay,
      };
    });

    const totalGross = lineItemsData.reduce((s, i) => s + i.grossPay, 0);
    const totalDeductions = lineItemsData.reduce(
      (s, i) => s + i.taxDeduction + i.otherDeductions,
      0,
    );
    const totalNet = lineItemsData.reduce((s, i) => s + i.netPay, 0);

    const run = await this.prisma.$transaction(async (tx) => {
      return tx.payrollRun.create({
        data: {
          month,
          status: PayrollStatus.DRAFT,
          totalGross,
          totalDeductions,
          totalNet,
          createdBy: userId,
          lineItems: { create: lineItemsData },
        },
        include: { lineItems: true },
      });
    });

    this.auditService.log({
      userId,
      userEmail: '',
      action: 'payroll.run_created',
      entityType: 'PayrollRun',
      entityId: run.id,
      newValue: { month, employeeCount: lineItemsData.length, totalNet },
    });

    return run;
  }

  async findAllRuns(month?: string) {
    const runs = await this.prisma.payrollRun.findMany({
      where: month ? { month } : undefined,
      include: {
        lineItems: true,
      },
      orderBy: { month: 'desc' },
    });
    return runs.map((r) => this.serializeRun(r));
  }

  async findRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { lineItems: true, expenses: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return this.serializeRun(run);
  }

  async adjustLineItem(
    runId: string,
    lineItemId: string,
    dto: AdjustLineItemDto,
    userId: string,
  ) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');

    if (run.status === PayrollStatus.LOCKED) {
      throw new BadRequestException('Cannot adjust a locked payroll run');
    }

    if (run.status === PayrollStatus.PROCESSED) {
      throw new BadRequestException('Cannot adjust a processed payroll run');
    }

    const lineItem = await this.prisma.payrollLineItem.findFirst({
      where: { id: lineItemId, payrollRunId: runId },
    });
    if (!lineItem) throw new NotFoundException('Line item not found');

    if (lineItem.employeeId === userId) {
      throw new ForbiddenException(
        'You cannot adjust your own payroll line item. Contact the CEO or another Finance Manager.',
      );
    }

    const taxRateSetting = await this.settingsService.get('payroll_tax_rate');
    const taxRate = taxRateSetting ? Number(taxRateSetting) / 100 : 0.2;

    const base =
      dto.baseSalary !== undefined
        ? dto.baseSalary
        : Number(lineItem.baseSalary);
    const commission =
      dto.commission !== undefined
        ? dto.commission
        : Number(lineItem.commission);
    const bonus =
      dto.bonus !== undefined ? dto.bonus : Number(lineItem.bonus);
    const otherDeductions =
      dto.otherDeductions !== undefined
        ? dto.otherDeductions
        : Number(lineItem.otherDeductions);

    const gross = base + commission + bonus;
    const taxDeduction = Number((gross * taxRate).toFixed(2));
    const netPay = gross - taxDeduction - otherDeductions;

    const updated = await this.prisma.payrollLineItem.update({
      where: { id: lineItemId },
      data: {
        baseSalary: base,
        commission,
        bonus,
        grossPay: gross,
        taxDeduction,
        otherDeductions,
        netPay,
        adjustedBy: userId,
        adjustmentReason: dto.reason,
        notes: dto.notes,
      },
    });

    await this.recalculateRunTotals(runId);

    return this.serializeLineItem(updated);
  }

  async processRun(runId: string, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { lineItems: true },
    });

    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException(
        `Payroll run is ${run.status} and cannot be processed again`,
      );
    }

    if (run.createdBy === userId) {
      throw new ForbiddenException(
        'The person who created the payroll run cannot also process it. This is a separation of duties control.',
      );
    }

    for (const lineItem of run.lineItems) {
      try {
        const pdfBuffer = await this.payslipPdfService.generate(lineItem, run);
        await this.payslipEmailService.send(lineItem, run.month, pdfBuffer);

        await this.prisma.payrollLineItem.update({
          where: { id: lineItem.id },
          data: { payslipSent: true },
        });
      } catch (err) {
        this.logger.error(
          `Failed to send payslip for employee ${lineItem.employeeId}`,
          err,
        );
      }
    }

    const agentIds = run.lineItems
      .filter((i) => Number(i.commission) > 0)
      .map((i) => i.employeeId);

    if (agentIds.length > 0) {
      await this.prisma.commissionRecord.updateMany({
        where: {
          agentId: { in: agentIds },
          month: run.month,
          status: CommissionStatus.APPROVED,
        },
        data: { status: CommissionStatus.PAID },
      });
    }

    const processedRun = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: PayrollStatus.PROCESSED,
        processedAt: new Date(),
        processedBy: userId,
      },
      include: { lineItems: true, expenses: true },
    });

    // Create Finance Expense records so payroll costs appear in the P&L
    const periodLabel = format(parse(run.month, 'yyyy-MM', new Date()), 'MMMM yyyy');

    const totalSalaries = run.lineItems.reduce(
      (sum, item) => sum + Number(item.baseSalary) + Number(item.bonus),
      0,
    );
    const totalCommissions = run.lineItems.reduce(
      (sum, item) => sum + Number(item.commission),
      0,
    );

    if (totalSalaries > 0) {
      await this.prisma.expense.create({
        data: {
          vendorName: `Staff salaries — ${periodLabel}`,
          amount: totalSalaries,
          currency: run.currency ?? 'RWF',
          category: ExpenseCategory.STAFF,
          date: new Date(),
          notes: `Auto-created from payroll run for ${periodLabel}. ${run.lineItems.length} employee${run.lineItems.length !== 1 ? 's' : ''}.`,
          isPayrollExpense: true,
          payrollRunId: runId,
          createdBy: userId,
        },
      });
    }

    if (totalCommissions > 0) {
      const commissionCount = run.lineItems.filter((i) => Number(i.commission) > 0).length;
      await this.prisma.expense.create({
        data: {
          vendorName: `Sales commissions — ${periodLabel}`,
          amount: totalCommissions,
          currency: run.currency ?? 'RWF',
          category: ExpenseCategory.COMMISSION,
          date: new Date(),
          notes: `Auto-created from payroll run for ${periodLabel}. ${commissionCount} commission${commissionCount !== 1 ? 's' : ''} paid.`,
          isPayrollExpense: true,
          payrollRunId: runId,
          createdBy: userId,
        },
      });
    }

    this.logger.log(
      `Payroll run processed for ${periodLabel}. Salaries: ${totalSalaries.toFixed(2)}, Commissions: ${totalCommissions.toFixed(2)}`,
    );

    this.auditService.log({
      userId,
      userEmail: '',
      action: 'payroll.run_processed',
      entityType: 'PayrollRun',
      entityId: runId,
      newValue: {
        month: run.month,
        totalNet: Number(run.totalNet),
        employeeCount: run.lineItems.length,
      },
    });

    return this.serializeRun(processedRun);
  }

  async lockRun(runId: string, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollStatus.PROCESSED) {
      throw new BadRequestException('Only PROCESSED payroll runs can be locked');
    }

    const locked = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: PayrollStatus.LOCKED,
        lockedAt: new Date(),
        lockedBy: userId,
      },
      include: { lineItems: true },
    });

    return this.serializeRun(locked);
  }

  async getPayslipPdf(runId: string, lineItemId: string, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { lineItems: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const lineItem = run.lineItems.find((i) => i.id === lineItemId);
    if (!lineItem) throw new NotFoundException('Line item not found');

    return this.payslipPdfService.generate(lineItem, run);
  }

  async createSalary(dto: CreateEmployeeSalaryDto, userId: string) {
    const salary = await this.prisma.employeeSalary.create({
      data: {
        employeeId: dto.employeeId,
        employeeName: dto.employeeName,
        employeeEmail: dto.employeeEmail,
        baseSalary: dto.baseSalary,
        currency: dto.currency ?? 'RWF',
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        createdBy: userId,
      },
    });
    return this.serializeSalary(salary);
  }

  async findAllSalaries() {
    const salaries = await this.getActivePayrollSalaries();
    return salaries.map((s) => ({
      id: s.employeeId,
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      employeeEmail: s.employeeEmail,
      baseSalary: Number(s.baseSalary),
      currency: s.currency,
      effectiveFrom: s.effectiveFrom.toISOString(),
      isActive: true,
      createdBy: 'hr',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  async updateSalary(id: string, dto: UpdateEmployeeSalaryDto) {
    const existing = await this.prisma.employeeSalary.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Salary record not found');

    const salary = await this.prisma.employeeSalary.update({
      where: { id },
      data: {
        ...(dto.employeeName !== undefined
          ? { employeeName: dto.employeeName }
          : {}),
        ...(dto.employeeEmail !== undefined
          ? { employeeEmail: dto.employeeEmail }
          : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: dto.baseSalary } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.effectiveFrom !== undefined
          ? { effectiveFrom: new Date(dto.effectiveFrom) }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.serializeSalary(salary);
  }

  async getPayrollPreview(month: string) {
    const salaries = await this.getActivePayrollSalaries();
    const commissions = await this.prisma.commissionRecord.findMany({
      where: { month, status: CommissionStatus.APPROVED },
    });
    const totalCommission = commissions.reduce(
      (s, c) => s + Number(c.adjustedAmount ?? c.calculatedAmount),
      0,
    );
    const agentCount = new Set(commissions.map((c) => c.agentId)).size;

    const taxRateSetting = await this.settingsService.get('payroll_tax_rate');
    const taxRate = taxRateSetting ? Number(taxRateSetting) / 100 : 0.2;

    const commissionByAgent = commissions.reduce<Record<string, number>>(
      (acc, c) => {
        const amount = Number(c.adjustedAmount ?? c.calculatedAmount);
        acc[c.agentId] = (acc[c.agentId] ?? 0) + amount;
        return acc;
      },
      {},
    );

    const estimatedNet = salaries.reduce((sum, salary) => {
      const base = Number(salary.baseSalary);
      const commission = commissionByAgent[salary.employeeId] ?? 0;
      const gross = base + commission;
      return sum + gross - gross * taxRate;
    }, 0);

    return {
      employeeCount: salaries.length,
      approvedCommissionTotal: totalCommission,
      agentCount,
      estimatedTotalNet: Number(estimatedNet.toFixed(2)),
    };
  }

  private parseMonthEnd(month: string): Date {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const m = Number(monthStr);
    return new Date(year, m, 0, 23, 59, 59, 999);
  }

  private async getActivePayrollSalaries(month?: string): Promise<
    Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      baseSalary: number;
      currency: string;
      effectiveFrom: Date;
    }>
  > {
    const monthEnd = month ? this.parseMonthEnd(month) : new Date();

    const employees = await this.prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        salaryHistory: {
          where: { effectiveFrom: { lte: monthEnd } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });

    if (employees.length > 0) {
      return employees.map((e) => {
        const latestHistory = e.salaryHistory[0];
        const effectiveSalary = latestHistory
          ? Number(latestHistory.newSalary)
          : Number(e.baseSalary);

        return {
          employeeId: e.userId,
          employeeName: `${e.firstName} ${e.lastName}`,
          employeeEmail: e.email,
          baseSalary: effectiveSalary,
          currency: latestHistory?.currency ?? e.currency,
          effectiveFrom: latestHistory?.effectiveFrom ?? e.salaryEffectiveFrom,
        };
      });
    }

    const legacy = await this.prisma.employeeSalary.findMany({
      where: { isActive: true },
    });

    return legacy.map((s) => ({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      employeeEmail: s.employeeEmail,
      baseSalary: Number(s.baseSalary),
      currency: s.currency,
      effectiveFrom: s.effectiveFrom,
    }));
  }

  private async recalculateRunTotals(runId: string): Promise<void> {
    const items = await this.prisma.payrollLineItem.findMany({
      where: { payrollRunId: runId },
    });

    const totalGross = items.reduce((s, i) => s + Number(i.grossPay), 0);
    const totalDeductions = items.reduce(
      (s, i) => s + Number(i.taxDeduction) + Number(i.otherDeductions),
      0,
    );
    const totalNet = items.reduce((s, i) => s + Number(i.netPay), 0);

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { totalGross, totalDeductions, totalNet },
    });
  }

  private serializeRun(
    run: PayrollRun & {
      lineItems: Prisma.PayrollLineItemGetPayload<object>[];
      expenses?: Prisma.ExpenseGetPayload<object>[];
    },
  ) {
    return {
      id: run.id,
      month: run.month,
      status: run.status,
      processedAt: run.processedAt?.toISOString() ?? null,
      processedBy: run.processedBy,
      lockedAt: run.lockedAt?.toISOString() ?? null,
      lockedBy: run.lockedBy,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNet: Number(run.totalNet),
      currency: run.currency,
      notes: run.notes,
      createdBy: run.createdBy,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      lineItems: run.lineItems.map((i) => this.serializeLineItem(i)),
      expenses: (run.expenses ?? []).map((e) => ({
        id: e.id,
        vendorName: e.vendorName,
        amount: Number(e.amount),
        currency: e.currency,
        category: e.category,
      })),
    };
  }

  private serializeLineItem(
    item: Prisma.PayrollLineItemGetPayload<object>,
  ) {
    return {
      id: item.id,
      payrollRunId: item.payrollRunId,
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      employeeEmail: item.employeeEmail,
      baseSalary: Number(item.baseSalary),
      commission: Number(item.commission),
      bonus: Number(item.bonus),
      grossPay: Number(item.grossPay),
      taxDeduction: Number(item.taxDeduction),
      otherDeductions: Number(item.otherDeductions),
      netPay: Number(item.netPay),
      payslipSent: item.payslipSent,
      payslipUrl: item.payslipUrl,
      notes: item.notes,
      adjustedBy: item.adjustedBy,
      adjustmentReason: item.adjustmentReason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeSalary(salary: Prisma.EmployeeSalaryGetPayload<object>) {
    return {
      id: salary.id,
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      employeeEmail: salary.employeeEmail,
      baseSalary: Number(salary.baseSalary),
      currency: salary.currency,
      effectiveFrom: salary.effectiveFrom.toISOString(),
      isActive: salary.isActive,
      createdBy: salary.createdBy,
      createdAt: salary.createdAt.toISOString(),
      updatedAt: salary.updatedAt.toISOString(),
    };
  }
}
