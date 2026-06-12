import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { seedRbac } from './run-rbac-seed';

@Injectable()
export class RbacBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await seedRbac(this.prisma);
      this.logger.log('RBAC seed completed');
    } catch (error) {
      this.logger.error('RBAC seed failed', String(error));
    }
  }
}
