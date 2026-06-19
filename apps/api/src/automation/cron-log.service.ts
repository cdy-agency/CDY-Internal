import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CronRunResult {
  itemsProcessed: number;
  errors: number;
}

@Injectable()
export class CronLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    jobName: string,
    startedAt: Date,
    result: CronRunResult,
  ): Promise<void> {
    const { itemsProcessed, errors } = result;
    const status =
      errors === 0 ? 'SUCCESS' : itemsProcessed > 0 ? 'PARTIAL' : 'FAILED';

    await this.prisma.cronLog.create({
      data: {
        jobName,
        startedAt,
        completedAt: new Date(),
        itemsProcessed,
        errors,
        status,
      },
    });
  }
}
