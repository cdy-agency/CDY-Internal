import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { HrSummaryService } from '../hr-summary.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [NotificationsModule, AttendanceModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveBalanceService, HrSummaryService],
  exports: [LeaveService, LeaveBalanceService],
})
export class LeaveModule {}
