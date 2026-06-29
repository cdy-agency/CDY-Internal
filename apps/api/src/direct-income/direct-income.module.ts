import { Module } from '@nestjs/common';
import { DirectIncomeController } from './direct-income.controller';
import { DirectIncomeService } from './direct-income.service';

@Module({
  controllers: [DirectIncomeController],
  providers: [DirectIncomeService],
  exports: [DirectIncomeService],
})
export class DirectIncomeModule {}
