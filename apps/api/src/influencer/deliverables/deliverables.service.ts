import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliverableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';

@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(assignmentId: string, dto: CreateDeliverableDto) {
    return this.prisma.deliverable.create({
      data: {
        campaignInfluencerId: assignmentId,
        description: dto.description,
        platform: dto.platform,
        contentType: dto.contentType,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: DeliverableStatus.PENDING,
      },
    });
  }

  async markSubmitted(id: string, postUrl?: string) {
    return this.prisma.deliverable.update({
      where: { id },
      data: {
        status: DeliverableStatus.SUBMITTED,
        ...(postUrl && { postUrl }),
        updatedAt: new Date(),
      },
    });
  }

  async verify(id: string, userId: string) {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id },
    });
    if (!deliverable) throw new NotFoundException();

    if (deliverable.status === DeliverableStatus.VERIFIED) {
      throw new BadRequestException('Deliverable is already verified');
    }

    return this.prisma.deliverable.update({
      where: { id },
      data: {
        status: DeliverableStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: userId,
        updatedAt: new Date(),
      },
    });
  }

  async markMissed(id: string) {
    return this.prisma.deliverable.update({
      where: { id },
      data: { status: DeliverableStatus.MISSED, updatedAt: new Date() },
    });
  }
}
