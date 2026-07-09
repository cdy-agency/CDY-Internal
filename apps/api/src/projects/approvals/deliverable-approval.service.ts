import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityEventType,
  ApprovalStatus,
  NotificationType,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ProjectActivityService } from '../activity/project-activity.service';
import {
  ApprovalDecision,
  RecordApprovalDto,
  RequestApprovalDto,
} from './approval.dto';

@Injectable()
export class DeliverableApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly projectActivityService: ProjectActivityService,
  ) {}

  async request(taskId: string, dto: RequestApprovalDto, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        project: {
          select: { id: true, name: true, managerId: true, clientId: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const approval = await this.prisma.deliverableApproval.create({
      data: {
        taskId,
        projectId: task.projectId,
        title: dto.title,
        description: dto.description,
        fileUrl: dto.fileUrl,
        requestedBy: userId,
        status: ApprovalStatus.PENDING_APPROVAL,
      },
    });

    await this.prisma.task.update({
      where: { id: taskId },
      data: { approvalStatus: ApprovalStatus.PENDING_APPROVAL },
    });

    const manager = await this.prisma.employee.findUnique({
      where: { id: task.project.managerId },
      select: { userId: true },
    });
    if (manager) {
      await this.notificationsService.createNotification({
        userId: manager.userId,
        type: NotificationType.SYSTEM,
        title: `Approval requested — ${dto.title}`,
        body: `A deliverable on ${task.project.name} is ready for client approval.`,
        link: `/projects/${task.projectId}?tab=approvals`,
      });
    }

    this.projectActivityService.log({
      projectId: task.projectId,
      userId,
      type: ActivityEventType.APPROVAL_REQUESTED,
      summary: `Approval requested for "${dto.title}" on task "${task.title}"`,
      metadata: { approvalId: approval.id, taskId },
    });

    return this.serializeApproval(approval, task.title);
  }

  async recordDecision(
    projectId: string,
    approvalId: string,
    dto: RecordApprovalDto,
    userId: string,
  ) {
    if (dto.decision === ApprovalDecision.REJECT && !dto.note?.trim()) {
      throw new BadRequestException(
        'A note is required when rejecting an approval',
      );
    }

    const approval = await this.prisma.deliverableApproval.findFirst({
      where: { id: approvalId, projectId },
      include: { task: { include: { project: true } } },
    });
    if (!approval) throw new NotFoundException('Approval not found');

    if (approval.status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This approval has already been decided');
    }

    const newStatus =
      dto.decision === ApprovalDecision.APPROVE
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.CHANGES_REQUESTED;

    const updated = await this.prisma.deliverableApproval.update({
      where: { id: approvalId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewerNote: dto.note,
        approvedBy: userId,
      },
    });

    await this.prisma.task.update({
      where: { id: approval.taskId },
      data: { approvalStatus: newStatus },
    });

    if (
      dto.decision === ApprovalDecision.APPROVE &&
      approval.task.requiresApproval
    ) {
      await this.prisma.task.update({
        where: { id: approval.taskId },
        data: {
          status: TaskStatus.DONE,
          completedAt: new Date(),
        },
      });

      this.projectActivityService.log({
        projectId: approval.task.projectId,
        userId,
        type: ActivityEventType.TASK_STATUS_CHANGED,
        summary: `Task "${approval.task.title}" completed after deliverable approval`,
        metadata: { taskId: approval.taskId, status: TaskStatus.DONE },
      });
    }

    if (approval.task.assigneeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: approval.task.assigneeId },
        select: { userId: true },
      });
      if (employee) {
        await this.notificationsService.createNotification({
          userId: employee.userId,
          type: NotificationType.SYSTEM,
          title:
            dto.decision === ApprovalDecision.APPROVE
              ? `Deliverable approved — ${approval.title}`
              : `Changes requested — ${approval.title}`,
          body: dto.note
            ? `Client feedback: ${dto.note}`
            : dto.decision === ApprovalDecision.APPROVE
              ? 'Great work! The deliverable has been approved.'
              : 'The client has requested changes.',
          link: `/projects/${approval.task.projectId}?task=${approval.taskId}`,
        });
      }
    }

    this.projectActivityService.log({
      projectId: approval.task.projectId,
      userId,
      type:
        dto.decision === ApprovalDecision.APPROVE
          ? ActivityEventType.APPROVAL_GIVEN
          : ActivityEventType.APPROVAL_REJECTED,
      summary:
        dto.decision === ApprovalDecision.APPROVE
          ? `"${approval.title}" approved`
          : `"${approval.title}" — changes requested`,
      metadata: { approvalId, note: dto.note ?? null },
    });

    return this.serializeApproval(updated, approval.task.title);
  }

  async getByProject(projectId: string) {
    const approvals = await this.prisma.deliverableApproval.findMany({
      where: { projectId },
      include: {
        task: { select: { title: true, milestoneId: true, requiresApproval: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requesterIds = [...new Set(approvals.map((a) => a.requestedBy))];
    const users =
      requesterIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: requesterIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    return approvals.map((a) => ({
      ...this.serializeApproval(a, a.task.title),
      taskMilestoneId: a.task.milestoneId,
      taskRequiresApproval: a.task.requiresApproval,
      requestedByName: userMap.get(a.requestedBy) ?? 'Unknown',
    }));
  }

  async remove(projectId: string, approvalId: string) {
    const approval = await this.prisma.deliverableApproval.findFirst({
      where: { id: approvalId, projectId },
    });
    if (!approval) throw new NotFoundException('Approval not found');

    await this.prisma.deliverableApproval.delete({ where: { id: approvalId } });

    return { message: 'Approval deleted' };
  }

  private serializeApproval(
    approval: {
      id: string;
      taskId: string;
      projectId: string;
      title: string;
      description: string | null;
      fileUrl: string | null;
      status: ApprovalStatus;
      requestedBy: string;
      requestedAt: Date;
      reviewedAt: Date | null;
      reviewerNote: string | null;
      approvedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    taskTitle: string,
  ) {
    return {
      id: approval.id,
      taskId: approval.taskId,
      projectId: approval.projectId,
      title: approval.title,
      description: approval.description,
      fileUrl: approval.fileUrl,
      status: approval.status,
      requestedBy: approval.requestedBy,
      requestedAt: approval.requestedAt.toISOString(),
      reviewedAt: approval.reviewedAt?.toISOString() ?? null,
      reviewerNote: approval.reviewerNote,
      approvedBy: approval.approvedBy,
      createdAt: approval.createdAt.toISOString(),
      updatedAt: approval.updatedAt.toISOString(),
      taskTitle,
    };
  }
}
