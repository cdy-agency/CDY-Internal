import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import { HourlyRateService } from '../hourly-rates/hourly-rate.service';
import { CreateTimeEntryDto } from '../tasks/dto/task.dto';

interface EmployeeTimeSummary {
  hours: number;
  billableHours: number;
  labourCost: number;
  entries: Array<ReturnType<TimeService['serializeEntry']> & {
    hourlyRate: number;
    labourCost: number;
  }>;
}

@Injectable()
export class TimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly projectActivityService: ProjectActivityService,
    private readonly hourlyRateService: HourlyRateService,
  ) {}

  async logTime(dto: CreateTimeEntryDto, userId: string) {
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, projectId: dto.projectId, deletedAt: null },
      });
      if (!task) {
        throw new BadRequestException('Task does not belong to this project');
      }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.hours <= 0 || dto.hours > 24) {
      throw new BadRequestException('Hours must be between 0.01 and 24');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        projectId: dto.projectId,
        taskId: dto.taskId,
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: dto.hours,
        description: dto.description,
        isBillable: dto.isBillable ?? true,
      },
      include: {
        task: { select: { title: true } },
      },
    });

    await this.cacheService.del(`projects:budget:${dto.projectId}`);
    await this.cacheService.del(`projects:profitability:${dto.projectId}`);
    await this.cacheService.delByPrefix('projects:budget-actual');

    const taskTitle = entry.task?.title ?? 'general work';
    this.projectActivityService.log({
      projectId: dto.projectId,
      userId,
      type: ActivityEventType.TIME_LOGGED,
      summary: `${dto.hours}h logged — ${taskTitle}`,
      metadata: {
        entryId: entry.id,
        taskId: dto.taskId ?? null,
        hours: dto.hours,
        employeeId: dto.employeeId,
      },
    });

    return this.serializeEntry(entry);
  }

  async findByProject(projectId: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { projectId },
      include: { task: { select: { title: true } } },
      orderBy: { date: 'desc' },
    });

    const employeeIds = [...new Set(entries.map((e) => e.employeeId))];
    const employees =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const nameMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
    );

    return entries.map((e) => ({
      ...this.serializeEntry(e),
      employeeName: nameMap.get(e.employeeId) ?? 'Unknown',
    }));
  }

  async findMyEntries(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return [];

    const entries = await this.prisma.timeEntry.findMany({
      where: { employeeId: employee.id },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: { date: 'desc' },
    });

    return entries.map((e) => ({
      ...this.serializeEntry(e),
      task: e.task ? { id: e.task.id, title: e.task.title } : null,
      project: {
        id: e.project.id,
        name: e.project.name,
        projectCode: e.project.projectCode,
      },
    }));
  }

  async getProjectSummary(projectId: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { projectId },
      include: {
        task: { select: { title: true, milestoneId: true } },
      },
      orderBy: { date: 'desc' },
    });

    const employeeIds = [...new Set(entries.map((e) => e.employeeId))];
    const rates = await this.hourlyRateService.getTeamRates(employeeIds);

    const enriched = entries.map((e) => {
      const hourlyRate = rates[e.employeeId] ?? 0;
      const labourCost = Number(
        (Number(e.hours) * hourlyRate).toFixed(2),
      );
      return {
        ...this.serializeEntry(e),
        hourlyRate,
        labourCost,
        milestoneId: e.task?.milestoneId ?? null,
      };
    });

    const totalHours = enriched.reduce((s, e) => s + Number(e.hours), 0);
    const billableHours = enriched
      .filter((e) => e.isBillable)
      .reduce((s, e) => s + Number(e.hours), 0);
    const totalLabourCost = enriched
      .filter((e) => e.isBillable)
      .reduce((s, e) => s + e.labourCost, 0);

    const byEmployee = enriched.reduce<Record<string, EmployeeTimeSummary>>(
      (acc, e) => {
        if (!acc[e.employeeId]) {
          acc[e.employeeId] = {
            hours: 0,
            billableHours: 0,
            labourCost: 0,
            entries: [],
          };
        }
        acc[e.employeeId].hours += Number(e.hours);
        if (e.isBillable) {
          acc[e.employeeId].billableHours += Number(e.hours);
          acc[e.employeeId].labourCost += e.labourCost;
        }
        acc[e.employeeId].entries.push(e);
        return acc;
      },
      {},
    );

    const employeeRecords =
      employeeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const empMap = new Map(
      employeeRecords.map((e) => [
        e.id,
        `${e.firstName} ${e.lastName}`,
      ]),
    );

    const byEmployeeNamed = Object.fromEntries(
      Object.entries(byEmployee).map(([id, summary]) => [
        id,
        {
          ...summary,
          employeeName: empMap.get(id) ?? 'Unknown',
          hours: Number(summary.hours.toFixed(2)),
          billableHours: Number(summary.billableHours.toFixed(2)),
          labourCost: Number(summary.labourCost.toFixed(2)),
        },
      ]),
    );

    return {
      totalHours: Number(totalHours.toFixed(2)),
      billableHours: Number(billableHours.toFixed(2)),
      totalLabourCost: Number(totalLabourCost.toFixed(2)),
      byEmployee: byEmployeeNamed,
      entries: enriched,
    };
  }

  serializeEntry(entry: {
    id: string;
    projectId: string;
    taskId: string | null;
    employeeId: string;
    date: Date;
    hours: { toString(): string } | number;
    description: string | null;
    isBillable: boolean;
    createdAt: Date;
    updatedAt: Date;
    task?: { title: string; milestoneId?: string | null } | null;
  }) {
    return {
      id: entry.id,
      projectId: entry.projectId,
      taskId: entry.taskId,
      taskTitle: entry.task?.title ?? null,
      employeeId: entry.employeeId,
      date: entry.date.toISOString(),
      hours: Number(entry.hours),
      description: entry.description,
      isBillable: entry.isBillable,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
