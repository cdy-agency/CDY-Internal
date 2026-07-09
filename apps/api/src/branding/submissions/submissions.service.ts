import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScopeStatus, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(scopeItemId: string, dto: CreateSubmissionDto, userId: string) {
    const scopeItem = await this.prisma.brandingScopeItem.findUnique({
      where: { id: scopeItemId },
      include: {
        brandingProject: { select: { name: true, clientId: true } },
      },
    });
    if (!scopeItem) throw new NotFoundException();

    if (scopeItem.status === ScopeStatus.APPROVED) {
      throw new BadRequestException('This scope item is already approved');
    }

    const latest = await this.prisma.designSubmission.findFirst({
      where: { scopeItemId },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    if (latest?.status === SubmissionStatus.PENDING) {
      await this.prisma.designSubmission.update({
        where: { id: latest.id },
        data: {
          status: SubmissionStatus.REJECTED,
          clientFeedback: 'Superseded by new version',
        },
      });
    }

    const submission = await this.prisma.designSubmission.create({
      data: {
        scopeItemId,
        version,
        fileUrl: dto.fileUrl,
        description: dto.description,
        status: SubmissionStatus.PENDING,
        submittedBy: userId,
      },
    });

    await this.prisma.brandingScopeItem.update({
      where: { id: scopeItemId },
      data: { status: ScopeStatus.SUBMITTED },
    });

    await this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Design submitted — v${version}`,
      body: `"${scopeItem.title}" (v${version}) has been submitted for client review on ${scopeItem.brandingProject.name}.`,
      link: `/branding/${scopeItem.brandingProjectId}`,
    });

    return submission;
  }

  async review(submissionId: string, dto: ReviewSubmissionDto, userId: string) {
    const submission = await this.prisma.designSubmission.findUnique({
      where: { id: submissionId },
      include: {
        scopeItem: {
          include: { brandingProject: { select: { name: true } } },
        },
      },
    });
    if (!submission) throw new NotFoundException();

    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException(
        'This submission has already been reviewed',
      );
    }

    if (dto.decision === 'REJECT' && !dto.clientFeedback) {
      throw new BadRequestException(
        'Client feedback is required when rejecting a submission',
      );
    }

    const newStatus =
      dto.decision === 'APPROVE'
        ? SubmissionStatus.APPROVED
        : SubmissionStatus.REJECTED;

    const updated = await this.prisma.designSubmission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: userId,
        clientFeedback: dto.clientFeedback,
      },
    });

    await this.prisma.brandingScopeItem.update({
      where: { id: submission.scopeItemId },
      data: {
        status:
          dto.decision === 'APPROVE'
            ? ScopeStatus.APPROVED
            : ScopeStatus.REJECTED,
      },
    });

    await this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title:
        dto.decision === 'APPROVE'
          ? `Design approved — ${submission.scopeItem.title}`
          : `Design rejected — ${submission.scopeItem.title}`,
      body:
        dto.decision === 'APPROVE'
          ? `Client approved "${submission.scopeItem.title}" v${submission.version}.`
          : `Client rejected "${submission.scopeItem.title}" v${submission.version}. Feedback: ${dto.clientFeedback ?? ''}`,
      link: `/branding/${submission.scopeItem.brandingProjectId}`,
    });

    return updated;
  }

  async remove(id: string) {
    const submission = await this.prisma.designSubmission.findUnique({
      where: { id },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    await this.prisma.designSubmission.delete({ where: { id } });

    return { message: 'Submission deleted' };
  }
}
