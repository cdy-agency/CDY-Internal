import { Module } from '@nestjs/common';
import { RetainersController } from './retainers.controller';
import { RetainersService } from './retainers.service';

@Module({
  controllers: [RetainersController],
  providers: [RetainersService],
  exports: [RetainersService],
})
export class RetainersModule {}
