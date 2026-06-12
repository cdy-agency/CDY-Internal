import { Injectable, Logger } from '@nestjs/common';
import { ActivityEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProjectActivityLogInput {
  projectId: string;
  userId: string;
  type: ActivityEventType;
  summary: string;
  metadata?: Record<string, Prisma.JsonValue>;
}

@Injectable()
export class ProjectActivityService {
  private readonly logger = new Logger(ProjectActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(data: ProjectActivityLogInput): void {
    void this.prisma.projectActivity
      .create({
        data: {
          projectId: data.projectId,
          userId: data.userId,
          type: data.type,
          summary: data.summary,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => {
        this.logger.error('Project activity log failed', String(err));
      });
  }

  async getProjectFeed(projectId: string, limit = 50) {
    const events = await this.prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = [...new Set(events.map((e) => e.userId))];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
    );

    return events.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      userId: event.userId,
      userName: userMap.get(event.userId) ?? 'Unknown',
      type: event.type,
      summary: event.summary,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    }));
  }
}
