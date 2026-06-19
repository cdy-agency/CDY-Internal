import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, PipelineStage } from '@prisma/client';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class CrmFollowUpRemindersJob {
  private readonly logger = new Logger(CrmFollowUpRemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('0 9 * * *', { name: 'crm-follow-up-reminders' })
  async sendFollowUpReminders(): Promise<void> {
    this.logger.log('Running CRM follow-up reminders...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(addDays(today, 1));

      const activities = await this.prisma.leadActivity.findMany({
        where: {
          nextActionDate: { lte: tomorrow },
          nextAction: { not: null },
          lead: {
            stage: {
              notIn: [PipelineStage.CLOSED_WON, PipelineStage.CLOSED_LOST],
            },
            deletedAt: null,
          },
        },
        include: {
          lead: {
            select: { id: true, companyName: true, assignedTo: true },
          },
        },
        orderBy: { nextActionDate: 'asc' },
        distinct: ['leadId'],
      });

      for (const activity of activities) {
        try {
          if (!activity.lead.assignedTo || !activity.nextActionDate) {
            continue;
          }

          const prefs =
            await this.prisma.crmNotificationPreference.findUnique({
              where: { userId: activity.lead.assignedTo },
            });

          if (prefs && !prefs.followUpReminders) {
            continue;
          }

          const isOverdue = activity.nextActionDate < today;
          const dayLabel = isOverdue ? 'overdue' : 'due today';

          await this.notificationsService.createNotification({
            userId: activity.lead.assignedTo,
            type: NotificationType.SYSTEM,
            title: `Follow-up ${dayLabel} — ${activity.lead.companyName}`,
            body: `Action: ${activity.nextAction}`,
            link: `/crm/leads/${activity.lead.id}`,
          });

          itemsProcessed++;
        } catch (err: unknown) {
          errors++;
          this.logger.error(
            `Failed follow-up reminder for lead ${activity.leadId}`,
            String(err),
          );
        }
      }

      this.logger.log(`Sent ${itemsProcessed} follow-up reminders`);
    } catch (err: unknown) {
      errors++;
      this.logger.error('CRM follow-up reminders failed', String(err));
    }

    await this.cronLog.log('crm-follow-up-reminders', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
