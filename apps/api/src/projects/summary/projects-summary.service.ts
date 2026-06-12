import { Injectable } from '@nestjs/common';
import {
  MilestoneStatus,
  ProjectStatus,
  TaskStatus,
} from '@prisma/client';
import { addDays, startOfDay, startOfMonth, subDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

const SUMMARY_CACHE_KEY = 'projects:summary';

@Injectable()
export class ProjectsSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getSummary() {
    const cached = await this.cache.get<object>(SUMMARY_CACHE_KEY);
    if (cached) return cached;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const weekStart = subDays(startOfDay(now), 7);
    const weekEnd = addDays(startOfDay(now), 7);

    const [
      totalProjects,
      activeProjects,
      onHold,
      completedThisMonth,
      totalTasks,
      overdueTasks,
      blockedTasks,
      tasksCompletedThisWeek,
      milestonesAwaitingApproval,
      byStatus,
      byServiceType,
      upcomingTasks,
    ] = await Promise.all([
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.project.count({
        where: { deletedAt: null, status: ProjectStatus.ACTIVE },
      }),
      this.prisma.project.count({
        where: { deletedAt: null, status: ProjectStatus.ON_HOLD },
      }),
      this.prisma.project.count({
        where: {
          deletedAt: null,
          status: ProjectStatus.COMPLETED,
          completedAt: { gte: monthStart },
        },
      }),
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          dueDate: { lt: now },
          status: { not: TaskStatus.DONE },
        },
      }),
      this.prisma.task.count({
        where: { deletedAt: null, status: TaskStatus.BLOCKED },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          status: TaskStatus.DONE,
          completedAt: { gte: weekStart },
        },
      }),
      this.prisma.milestone.count({
        where: { status: MilestoneStatus.COMPLETED },
      }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.project.groupBy({
        by: ['serviceType'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.task.findMany({
        where: {
          deletedAt: null,
          dueDate: { gte: startOfDay(now), lte: weekEnd },
          status: { not: TaskStatus.DONE },
        },
        include: {
          project: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ]);

    const assigneeIds = upcomingTasks
      .map((t) => t.assigneeId)
      .filter((id): id is string => Boolean(id));
    const employees =
      assigneeIds.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const nameMap = new Map(
      employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]),
    );

    const summary = {
      totalProjects,
      activeProjects,
      onHold,
      completedThisMonth,
      totalTasks,
      overdueTasks,
      blockedTasks,
      tasksCompletedThisWeek,
      milestonesAwaitingApproval,
      milestonesPendingApproval: await this.getAwaitingMilestones(),
      projectsByStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.id]),
      ) as Record<ProjectStatus, number>,
      projectsByServiceType: Object.fromEntries(
        byServiceType.map((s) => [s.serviceType, s._count.id]),
      ) as Record<string, number>,
      upcomingDeadlines: upcomingTasks.map((t) => ({
        taskId: t.id,
        projectId: t.projectId,
        title: t.title,
        projectName: t.project.name,
        dueDate: t.dueDate?.toISOString() ?? null,
        assigneeName: t.assigneeId
          ? (nameMap.get(t.assigneeId) ?? 'Unassigned')
          : 'Unassigned',
        priority: t.priority,
        status: t.status,
      })),
    };

    await this.cache.set(SUMMARY_CACHE_KEY, summary, 60);
    return summary;
  }

  async invalidateSummaryCache(): Promise<void> {
    await this.cache.del(SUMMARY_CACHE_KEY);
  }

  private async getAwaitingMilestones() {
    const milestones = await this.prisma.milestone.findMany({
      where: { status: MilestoneStatus.COMPLETED },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      projectName: m.project.name,
      name: m.name,
      billingAmount: m.billingAmount ? Number(m.billingAmount) : 0,
      currency: m.currency,
    }));
  }
}
