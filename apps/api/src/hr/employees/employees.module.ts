import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '../../cache/cache.module';
import { LeaveModule } from '../leave/leave.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { PerformanceModule } from '../performance/performance.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeCodeService } from './employee-code.service';
import { HrSummaryService } from '../hr-summary.service';

@Module({
  imports: [
    LeaveModule,
    OnboardingModule,
    CacheModule,
    forwardRef(() => PerformanceModule),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeCodeService, HrSummaryService],
  exports: [EmployeesService, EmployeeCodeService],
})
export class EmployeesModule {}
