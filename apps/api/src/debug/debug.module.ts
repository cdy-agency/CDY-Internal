import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [AutomationModule],
  controllers: [DebugController],
})
export class DebugModule {}
