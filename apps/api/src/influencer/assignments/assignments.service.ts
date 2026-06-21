import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CampaignStatus, DeliverableStatus, ExpenseCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignInfluencerDto } from './dto/assign-influencer.dto';
import { LogPaymentDto } from './dto/log-payment.dto';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assign(campaignId: string, dto: AssignInfluencerDto) {
    const campaign = await this.prisma.influencerCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException(
        'Can only assign influencers to active campaigns',
      );
    }

    const influencer = await this.prisma.influencer.findUnique({
      where: { id: dto.influencerId },
    });
    if (!influencer) throw new NotFoundException('Influencer not found');

    const existing = await this.prisma.campaignInfluencer.findUnique({
      where: {
        campaignId_influencerId: {
          campaignId,
          influencerId: dto.influencerId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This influencer is already assigned to this campaign',
      );
    }

    return this.prisma.campaignInfluencer.create({
      data: {
        campaignId,
        influencerId: dto.influencerId,
        agreedFee: dto.agreedFee ? dto.agreedFee : undefined,
        currency: dto.currency ?? 'RWF',
        notes: dto.notes,
        ...(dto.deliverables?.length && {
          deliverables: {
            create: dto.deliverables.map((d) => ({
              description: d.description,
              platform: d.platform,
              contentType: d.contentType,
              dueDate: d.dueDate ? new Date(d.dueDate) : null,
              status: DeliverableStatus.PENDING,
            })),
          },
        }),
      },
      include: {
        influencer: true,
        deliverables: true,
      },
    });
  }

  async remove(assignmentId: string) {
    const assignment = await this.prisma.campaignInfluencer.findUnique({
      where: { id: assignmentId },
      include: { deliverables: true },
    });
    if (!assignment) throw new NotFoundException();

    const hasVerified = assignment.deliverables.some(
      (d) => d.status === DeliverableStatus.VERIFIED,
    );
    if (hasVerified) {
      throw new BadRequestException(
        'Cannot remove an influencer who has verified deliverables',
      );
    }

    return this.prisma.campaignInfluencer.delete({
      where: { id: assignmentId },
    });
  }

  async logPayment(assignmentId: string, dto: LogPaymentDto, userId: string) {
    const assignment = await this.prisma.campaignInfluencer.findUnique({
      where: { id: assignmentId },
      include: {
        influencer: { select: { name: true } },
        campaign: { select: { name: true, currency: true } },
      },
    });
    if (!assignment) throw new NotFoundException();

    if (assignment.isPaid) {
      throw new BadRequestException('This influencer has already been paid');
    }

    const amount = parseFloat(dto.amount);
    const currency = assignment.campaign.currency ?? 'RWF';

    let expenseId: string | undefined;
    try {
      const expense = await this.prisma.expense.create({
        data: {
          category: ExpenseCategory.INFLUENCER_PAYMENT,
          vendorName: assignment.influencer.name,
          amount,
          currency,
          date: new Date(),
          notes: `Payment for campaign: ${assignment.campaign.name}${dto.notes ? ` — ${dto.notes}` : ''}`,
          createdBy: userId,
        },
      });
      expenseId = expense.id;
    } catch (err: unknown) {
      this.logger.error('Failed to create expense for influencer payment', err);
    }

    return this.prisma.campaignInfluencer.update({
      where: { id: assignmentId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paidAmount: dto.amount,
        paymentNotes: dto.notes,
        ...(expenseId ? { expenseId } : {}),
      },
    });
  }
}
