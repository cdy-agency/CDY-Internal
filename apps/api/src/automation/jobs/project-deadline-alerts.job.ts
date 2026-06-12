import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, TaskStatus } from '@prisma/client';
import { addHours, format, startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ProjectDeadlineAlertsJob {
  private readonly logger = new Logger(ProjectDeadlineAlertsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('30 7 * * *', { name: 'project-deadline-alerts' })
  async checkProjectDeadlines(): Promise<void> {
    this.logger.log('Running project deadline alerts...');

    const now = new Date();
    const in48Hours = addHours(now, 48);

    const dueSoon = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: in48Hours },
        status: { notIn: [TaskStatus.DONE] },
        deletedAt: null,
        assigneeId: { not: null },
      },
      include: {
        project: { select: { name: true, managerId: true } },
      },
    });

    for (const task of dueSoon) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: task.assigneeId! },
        select: { userId: true },
      });
      if (employee) {
        await this.notificationsService.createNotification({
          userId: employee.userId,
          type: NotificationType.SYSTEM,
          title: `Task due soon — ${task.title}`,
          body: `This task on ${task.project.name} is due ${format(task.dueDate!, 'MMM d')}. Please update the status.`,
          link: `/projects/${task.projectId}?task=${task.id}`,
        });
      }
    }

    const overdue = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: [TaskStatus.DONE] },
        deletedAt: null,
      },
      include: {
        project: { select: { name: true, managerId: true } },
      },
    });

    const byManager: Record<string, typeof overdue> = {};
    for (const task of overdue) {
      const mgr = task.project.managerId;
      if (!byManager[mgr]) byManager[mgr] = [];
      byManager[mgr].push(task);
    }

    for (const [managerId, tasks] of Object.entries(byManager)) {
      const manager = await this.prisma.employee.findUnique({
        where: { id: managerId },
        select: { userId: true },
      });
      if (manager) {
        await this.notificationsService.createNotification({
          userId: manager.userId,
          type: NotificationType.SYSTEM,
          title: `${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}`,
          body: `${tasks.length} task${tasks.length > 1 ? 's are' : ' is'} overdue across your projects. Review immediately.`,
          link: '/projects',
        });
      }
    }

    this.logger.log(
      `Deadline alerts: ${dueSoon.length} due soon, ${overdue.length} overdue`,
    );
  }
}
