import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createSoftDeleteExtension } from './soft-delete.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    // Applies globally: reads on models with `deletedAt` are scoped to
    // non-deleted rows, and delete/deleteMany become soft deletes. See
    // soft-delete.extension.ts for details and known limitations.
    Object.assign(this, this.$extends(createSoftDeleteExtension()));
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
