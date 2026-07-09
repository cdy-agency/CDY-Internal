import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ProjectStatus,
  TaskStatus,
} from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { ProjectsService } from '../projects/projects.service';
import { PortfolioReportFiltersDto } from './dto/portfolio-report-filters.dto';

type ProjectHealth = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';

@Injectable()
export class ProjectReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly projectsService: ProjectsService,
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
        ...(filters.from && { startDate: { gte: new Date(filters.from) } }),
        ...(filters.to && { startDate: { lte: new Date(filters.to) } }),
      },
      include: {
        client: { select: { companyName: true } },
        _count: {
          select: { tasks: { where: { deletedAt: null } } },
        },
      },
    });

    const totalRevenuePotential = projects.reduce(
      (s, p) => s + Number(p.totalCost ?? 0),
      0,
    );

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
            totalCost: p.totalCost ? Number(p.totalCost) : null,
            currency: p.currency,
            invoiceId: p.invoiceId ?? null,
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

    const serviceCost = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.serviceType] = (acc[p.serviceType] ?? 0) + Number(p.totalCost ?? 0);
      return acc;
    }, {});

    const result = {
      generatedAt: new Date().toISOString(),
      filters,
      summary: {
        totalProjects: projects.length,
        byStatus: {
          active: projects.filter((p) => p.status === ProjectStatus.ACTIVE).length,
          onHold: projects.filter((p) => p.status === ProjectStatus.ON_HOLD).length,
          completed: projects.filter((p) => p.status === ProjectStatus.COMPLETED).length,
          cancelled: projects.filter((p) => p.status === ProjectStatus.CANCELLED).length,
        },
        byServiceType,
        serviceCost,
        totalRevenuePotential: Number(totalRevenuePotential.toFixed(2)),
      },
      activeProjects: {
        onTrack: health.filter((h) => h.health === 'ON_TRACK').length,
        needsAttention: health.filter((h) => h.health === 'NEEDS_ATTENTION').length,
        atRisk: health.filter((h) => h.health === 'AT_RISK').length,
        projects: health,
      },
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async remove(id: string) {
    const report = await this.prisma.projectReport.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Project report not found');

    await this.prisma.projectReport.delete({ where: { id } });

    return { message: 'Project report deleted' };
  }
}
