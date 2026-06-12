import { Injectable } from '@nestjs/common';
import {
  MilestoneStatus,
  ProjectStatus,
  TaskStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectsService } from '../projects/projects.service';
import { HourlyRateService } from '../hourly-rates/hourly-rate.service';
import { PortfolioReportFiltersDto } from './dto/portfolio-report-filters.dto';

type ProjectHealth = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';

@Injectable()
export class ProjectReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly projectsService: ProjectsService,
    private readonly hourlyRateService: HourlyRateService,
  ) {}

  async getPortfolioReport(filters: PortfolioReportFiltersDto) {
    const cacheKey = `projects:portfolio:${JSON.stringify(filters)}`;
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(filters.status && { status: filters.status }),
        ...(filters.serviceType && { serviceType: filters.serviceType }),
        ...(filters.from && {
          startDate: { gte: new Date(filters.from) },
        }),
        ...(filters.to && {
          startDate: { lte: new Date(filters.to) },
        }),
      },
      include: {
        client: { select: { companyName: true } },
        milestones: { select: { status: true, billingAmount: true } },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });

    const allMilestones = projects.flatMap((p) => p.milestones);

    const totalRevenuePotential = allMilestones.reduce(
      (s, m) => s + Number(m.billingAmount ?? 0),
      0,
    );

    const totalRevenueInvoiced = allMilestones
      .filter((m) => m.status === MilestoneStatus.INVOICED)
      .reduce((s, m) => s + Number(m.billingAmount ?? 0), 0);

    const health = await Promise.all(
      projects
        .filter((p) => p.status === ProjectStatus.ACTIVE)
        .map(async (p) => {
          const progress = await this.projectsService.getProgress(p.id);
          const overdueTaskCount = await this.prisma.task.count({
            where: {
              projectId: p.id,
              dueDate: { lt: new Date() },
              status: { notIn: [TaskStatus.DONE] },
              deletedAt: null,
            },
          });

          let healthStatus: ProjectHealth = 'ON_TRACK';
          if (overdueTaskCount > 0) {
            healthStatus = 'AT_RISK';
          } else if (progress.blocked > 0) {
            healthStatus = 'NEEDS_ATTENTION';
          } else if (
            progress.progressPercent < 50 &&
            p.endDate &&
            new Date(p.endDate) < addDays(new Date(), 14)
          ) {
            healthStatus = 'AT_RISK';
          }

          return {
            projectId: p.id,
            projectCode: p.projectCode,
            name: p.name,
            client: p.client?.companyName ?? null,
            serviceType: p.serviceType,
            progress: progress.progressPercent,
            totalTasks: p._count.tasks,
            overdueTaskCount,
            blockedTasks: progress.blocked,
            endDate: p.endDate?.toISOString() ?? null,
            health: healthStatus,
          };
        }),
    );

    const byServiceType = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.serviceType] = (acc[p.serviceType] ?? 0) + 1;
      return acc;
    }, {});

    const serviceRevenue = projects.reduce<Record<string, number>>(
      (acc, p) => {
        const revenue = p.milestones.reduce(
          (s, m) => s + Number(m.billingAmount ?? 0),
          0,
        );
        acc[p.serviceType] = (acc[p.serviceType] ?? 0) + revenue;
        return acc;
      },
      {},
    );

    const result = {
      generatedAt: new Date().toISOString(),
      filters,
      summary: {
        totalProjects: projects.length,
        byStatus: {
          active: projects.filter((p) => p.status === ProjectStatus.ACTIVE)
            .length,
          onHold: projects.filter((p) => p.status === ProjectStatus.ON_HOLD)
            .length,
          completed: projects.filter(
            (p) => p.status === ProjectStatus.COMPLETED,
          ).length,
          cancelled: projects.filter(
            (p) => p.status === ProjectStatus.CANCELLED,
          ).length,
        },
        byServiceType,
        serviceRevenue,
        totalRevenuePotential: Number(totalRevenuePotential.toFixed(2)),
        totalRevenueInvoiced: Number(totalRevenueInvoiced.toFixed(2)),
      },
      activeProjects: {
        onTrack: health.filter((h) => h.health === 'ON_TRACK').length,
        needsAttention: health.filter((h) => h.health === 'NEEDS_ATTENTION')
          .length,
        atRisk: health.filter((h) => h.health === 'AT_RISK').length,
        projects: health,
      },
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBudgetVsActualReport(filters: PortfolioReportFiltersDto) {
    const cacheKey = `projects:budget-actual:${JSON.stringify(filters)}`;
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

    const budgets = await this.prisma.projectBudget.findMany({
      where: {
        ...(filters.from && { createdAt: { gte: new Date(filters.from) } }),
        ...(filters.to && { createdAt: { lte: new Date(filters.to) } }),
      },
    });

    const rows = await Promise.all(
      budgets.map(async (budget) => {
        const project = await this.prisma.project.findUnique({
          where: { id: budget.projectId },
          select: {
            projectCode: true,
            name: true,
            serviceType: true,
            status: true,
            client: { select: { companyName: true } },
          },
        });

        const expenses = await this.prisma.expense.aggregate({
          where: { projectId: budget.projectId, deletedAt: null },
          _sum: { amount: true },
        });

        const timeEntries = await this.prisma.timeEntry.findMany({
          where: { projectId: budget.projectId, isBillable: true },
          select: { hours: true, employeeId: true },
        });

        const employeeIds = [...new Set(timeEntries.map((e) => e.employeeId))];
        const rates = await this.hourlyRateService.getTeamRates(employeeIds);
        const labourCost = timeEntries.reduce(
          (s, e) => s + Number(e.hours) * (rates[e.employeeId] ?? 0),
          0,
        );

        const directCosts = Number(expenses._sum.amount ?? 0);
        const totalActual = labourCost + directCosts;
        const approved = Number(budget.approvedBudget);
        const variance = approved - totalActual;
        const variancePercent =
          approved > 0
            ? Number(((variance / approved) * 100).toFixed(2))
            : 0;

        return {
          projectId: budget.projectId,
          projectCode: project?.projectCode ?? null,
          name: project?.name ?? null,
          client: project?.client?.companyName ?? null,
          serviceType: project?.serviceType ?? null,
          status: project?.status ?? null,
          approvedBudget: approved,
          actualCosts: Number(totalActual.toFixed(2)),
          labourCost: Number(labourCost.toFixed(2)),
          directCosts: Number(directCosts.toFixed(2)),
          variance: Number(variance.toFixed(2)),
          variancePercent,
          isOverBudget: totalActual > approved,
          isBlocked: budget.isBlocked,
        };
      }),
    );

    rows.sort((a, b) => a.variancePercent - b.variancePercent);

    const result = {
      generatedAt: new Date().toISOString(),
      totals: {
        totalApprovedBudget: rows.reduce((s, r) => s + r.approvedBudget, 0),
        totalActualCosts: rows.reduce((s, r) => s + r.actualCosts, 0),
        totalVariance: rows.reduce((s, r) => s + r.variance, 0),
        projectsOverBudget: rows.filter((r) => r.isOverBudget).length,
      },
      projects: rows,
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }
}
