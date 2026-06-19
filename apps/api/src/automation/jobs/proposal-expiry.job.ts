import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CronLogService } from '../cron-log.service';

@Injectable()
export class ProposalExpiryJob {
  private readonly logger = new Logger(ProposalExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly cronLog: CronLogService,
  ) {}

  @Cron('30 8 * * *', { name: 'proposal-expiry-check' })
  async checkProposalExpiry(): Promise<void> {
    this.logger.log('Running proposal expiry check...');
    const startedAt = new Date();
    let itemsProcessed = 0;
    let errors = 0;

    try {
      const now = new Date();

      const expiredProposals = await this.prisma.proposal.findMany({
        where: {
          status: ProposalStatus.SENT,
          expiresAt: { lt: now },
        },
        include: {
          lead: {
            select: { assignedTo: true, companyName: true, id: true },
          },
        },
      });

      for (const proposal of expiredProposals) {
        try {
          await this.prisma.proposal.update({
            where: { id: proposal.id },
            data: { status: ProposalStatus.EXPIRED },
          });

          if (proposal.lead.assignedTo) {
            const prefs =
              await this.prisma.crmNotificationPreference.findUnique({
                where: { userId: proposal.lead.assignedTo },
              });

            if (prefs && !prefs.proposalExpiryAlerts) {
              itemsProcessed++;
              continue;
            }

            await this.notificationsService.createNotification({
              userId: proposal.lead.assignedTo,
              type: NotificationType.SYSTEM,
              title: `Proposal expired — ${proposal.lead.companyName}`,
              body: `Proposal "${proposal.title}" has expired. Follow up with the client or create a new proposal.`,
              link: `/crm/leads/${proposal.lead.id}`,
            });
          }

          itemsProcessed++;
        } catch (err: unknown) {
          errors++;
          this.logger.error(
            `Failed to expire proposal ${proposal.id}`,
            String(err),
          );
        }
      }

      this.logger.log(`Marked ${itemsProcessed} proposals as expired`);
    } catch (err: unknown) {
      errors++;
      this.logger.error('Proposal expiry check failed', String(err));
    }

    await this.cronLog.log('proposal-expiry-check', startedAt, {
      itemsProcessed,
      errors,
    });
  }
}
