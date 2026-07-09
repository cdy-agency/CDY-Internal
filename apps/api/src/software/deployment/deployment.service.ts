import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MaintenanceStatus, SoftwarePhase } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDeploymentDto,
  CreateMaintenanceLogDto,
} from './dto/create-deployment.dto';

@Injectable()
export class DeploymentService {
  constructor(private readonly prisma: PrismaService) {}

  async deploy(
    softwareProjectId: string,
    dto: CreateDeploymentDto,
    userId: string,
  ) {
    const project = await this.prisma.softwareProject.findUnique({
      where: { id: softwareProjectId },
    });
    if (!project) throw new NotFoundException('Software project not found');

    const existing = await this.prisma.deployment.findUnique({
      where: { softwareProjectId },
    });
    if (existing) {
      throw new ConflictException('This project has already been deployed');
    }

    const deployedAt = dto.deployedAt ? new Date(dto.deployedAt) : new Date();
    const maintenanceEndsAt = new Date(deployedAt);
    maintenanceEndsAt.setFullYear(maintenanceEndsAt.getFullYear() + 1);

    const deployment = await this.prisma.deployment.create({
      data: {
        softwareProjectId,
        deployedAt,
        deploymentUrl: dto.deploymentUrl,
        serverDetails: dto.serverDetails,
        deployedBy: userId,
        notes: dto.notes,
      },
    });

    await this.prisma.softwareProject.update({
      where: { id: softwareProjectId },
      data: {
        phase: SoftwarePhase.MAINTENANCE,
        deployedAt,
        maintenanceEndsAt,
      },
    });

    return deployment;
  }

  async findDeployment(softwareProjectId: string) {
    return this.prisma.deployment.findUnique({ where: { softwareProjectId } });
  }

  async logMaintenanceIssue(
    softwareProjectId: string,
    dto: CreateMaintenanceLogDto,
    userId: string,
  ) {
    const project = await this.prisma.softwareProject.findUnique({
      where: { id: softwareProjectId },
    });
    if (!project) throw new NotFoundException('Software project not found');

    if (project.phase !== SoftwarePhase.MAINTENANCE) {
      throw new BadRequestException(
        'Maintenance issues can only be logged after deployment',
      );
    }

    return this.prisma.maintenanceLog.create({
      data: {
        softwareProjectId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        notes: dto.notes,
        reportedAt: new Date(),
        status: MaintenanceStatus.OPEN,
        createdBy: userId,
      },
    });
  }

  async findMaintenanceLogs(softwareProjectId: string) {
    return this.prisma.maintenanceLog.findMany({
      where: { softwareProjectId },
      orderBy: { reportedAt: 'desc' },
    });
  }

  async resolveMaintenanceIssue(logId: string) {
    const log = await this.prisma.maintenanceLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new NotFoundException('Maintenance log not found');

    return this.prisma.maintenanceLog.update({
      where: { id: logId },
      data: { status: MaintenanceStatus.RESOLVED, resolvedAt: new Date() },
    });
  }

  async removeMaintenanceLog(logId: string): Promise<{ message: string }> {
    const log = await this.prisma.maintenanceLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new NotFoundException('Maintenance log not found');

    await this.prisma.maintenanceLog.delete({ where: { id: logId } });

    return { message: 'Maintenance log deleted' };
  }
}
