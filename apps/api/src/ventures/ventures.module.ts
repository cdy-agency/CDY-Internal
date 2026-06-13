import { Module } from '@nestjs/common';
import { VenturesController } from './ventures.controller';
import { VenturesService } from './ventures.service';
import { VentureIncomeController } from './income/venture-income.controller';
import { VentureIncomeService } from './income/venture-income.service';
import { VentureExpensesController } from './expenses/venture-expenses.controller';
import { VentureExpensesService } from './expenses/venture-expenses.service';

@Module({
  controllers: [
    VenturesController,
    VentureIncomeController,
    VentureExpensesController,
  ],
  providers: [VenturesService, VentureIncomeService, VentureExpensesService],
  exports: [VenturesService],
})
export class VenturesModule {}
