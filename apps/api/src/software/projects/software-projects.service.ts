import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SoftwarePhase,
  DocStatus,
  SprintStatus,
  BugSeverity,
  BugStatus,
  MaintenanceStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  CreateSoftwareProjectDto,
  UpdateSoftwareProjectDto,
} from './dto/create-software-project.dto';

@Injectable()
export class SoftwareProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateSoftwareProjectDto, userId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found in CRM');

    return this.prisma.softwareProject.create({
      data: {
        clientId: dto.clientId,
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        projectType: dto.projectType,
        startDate: new Date(dto.startDate),
        notes: dto.notes,
        phase: SoftwarePhase.REQUIREMENTS,
        createdBy: userId,
      },
      include: { client: { select: { companyName: true } } },
    });
  }

  async findAll() {
    return this.prisma.softwareProject.findMany({
      where: { isActive: true },
      include: {
        client: { select: { companyName: true } },
        devSprints: { select: { status: true } },
        deployment: { select: { deployedAt: true } },
        _count: {
          select: {
            maintenanceLogs: {
              where: { status: { not: MaintenanceStatus.RESOLVED } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.softwareProject.findUnique({
      where: { id },
      include: {
        client: true,
        requirements: { orderBy: { version: 'desc' } },
        designPhase: true,
        devSprints: {
          include: { items: { orderBy: { createdAt: 'asc' } } },
          orderBy: { startDate: 'asc' },
        },
        qaPhase: { include: { bugs: { orderBy: { severity: 'asc' } } } },
        deployment: true,
        maintenanceLogs: { orderBy: { reportedAt: 'desc' } },
      },
    });
    if (!p) throw new NotFoundException('Software project not found');
    return p;
  }

  async update(id: string, dto: UpdateSoftwareProjectDto) {
    await this.findOne(id);
    return this.prisma.softwareProject.update({ where: { id }, data: dto });
  }

  async advancePhase(id: string, userId: string) {
    const project = await this.findOne(id);

    const phaseOrder: SoftwarePhase[] = [
      SoftwarePhase.REQUIREMENTS,
      SoftwarePhase.DESIGN,
      SoftwarePhase.DEVELOPMENT,
      SoftwarePhase.QA,
      SoftwarePhase.DEPLOYMENT,
      SoftwarePhase.MAINTENANCE,
      SoftwarePhase.COMPLETED,
    ];

    const currentIndex = phaseOrder.indexOf(project.phase);
    if (currentIndex === phaseOrder.length - 1) {
      throw new BadRequestException('Project is already completed');
    }

    await this.validatePhaseCompletion(project);

    const nextPhase = phaseOrder[currentIndex + 1];

    const updated = await this.prisma.softwareProject.update({
      where: { id },
      data: { phase: nextPhase },
    });

    await this.notificationsService.createForRole('OPERATIONS_MANAGER', {
      type: 'SYSTEM',
      title: `Phase advanced — ${project.name}`,
      body: `${project.name} has moved to ${nextPhase.replace(/_/g, ' ')} phase.`,
      link: `/software/${id}`,
    });

    return updated;
  }

  private async validatePhaseCompletion(project: Awaited<ReturnType<SoftwareProjectsService['findOne']>>) {
    switch (project.phase) {
      case SoftwarePhase.REQUIREMENTS: {
        const signedDoc = project.requirements.find(
          (r) => r.status === DocStatus.SIGNED,
        );
        if (!signedDoc) {
          throw new BadRequestException(
            'At least one requirements document must be signed by the client before advancing to Design',
          );
        }
        break;
      }

      case SoftwarePhase.DEVELOPMENT: {
        const activeSprint = project.devSprints.find(
          (s) => s.status === SprintStatus.ACTIVE,
        );
        if (activeSprint) {
          throw new BadRequestException(
            'Cannot advance phase while a sprint is still active. Complete or skip the active sprint first.',
          );
        }
        break;
      }

      case SoftwarePhase.QA: {
        if (project.qaPhase && !project.qaPhase.isSkipped) {
          const openCritical = project.qaPhase.bugs.filter(
            (b) =>
              b.severity === BugSeverity.CRITICAL &&
              b.status !== BugStatus.RESOLVED,
          );
          if (openCritical.length > 0) {
            throw new BadRequestException(
              `${openCritical.length} CRITICAL bug${openCritical.length > 1 ? 's' : ''} must be resolved before deployment`,
            );
          }
        }
        break;
      }
    }
  }
}
