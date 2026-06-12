import { Module } from '@nestjs/common';
import { HrAuditModule } from './audit/hr-audit.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { LeaveModule } from './leave/leave.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HrSettingsModule } from './settings/hr-settings.module';
import { PerformanceModule } from './performance/performance.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HrReportsModule } from './reports/hr-reports.module';

@Module({
  imports: [
    HrAuditModule,
    EmployeesModule,
    DepartmentsModule,
    LeaveModule,
    AttendanceModule,
    HrSettingsModule,
    PerformanceModule,
    OnboardingModule,
    HrReportsModule,
  ],
})
export class HrModule {}
