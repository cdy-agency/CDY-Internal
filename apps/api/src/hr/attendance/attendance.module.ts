import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { HrSummaryService } from '../hr-summary.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, HrSummaryService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
