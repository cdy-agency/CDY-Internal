import { Module } from '@nestjs/common';
import { CompanyAccountsController } from './company-accounts.controller';
import { CompanyAccountsService } from './company-accounts.service';

@Module({
  controllers: [CompanyAccountsController],
  providers: [CompanyAccountsService],
  exports: [CompanyAccountsService],
})
export class CompanyAccountsModule {}
