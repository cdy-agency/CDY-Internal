import { Module } from '@nestjs/common';
import { ItController } from './it.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ItController],
})
export class ItModule {}
