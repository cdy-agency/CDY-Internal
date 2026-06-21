import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { EmployeesModule } from '../employees/employees.module';
import { RbacModule } from '../../rbac/rbac.module';
import { PerformanceReviewController } from './performance-review.controller';
import { PerformanceReviewService } from './performance-review.service';

@Module({
  imports: [NotificationsModule, forwardRef(() => EmployeesModule), RbacModule],
  controllers: [PerformanceReviewController],
  providers: [PerformanceReviewService],
  exports: [PerformanceReviewService],
})
export class PerformanceModule {}
