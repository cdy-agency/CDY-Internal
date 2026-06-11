import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayslipPdfService } from './payslip-pdf.service';
import { PayslipEmailService } from './payslip-email.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayslipPdfService, PayslipEmailService],
  exports: [PayrollService],
})
export class PayrollModule {}
