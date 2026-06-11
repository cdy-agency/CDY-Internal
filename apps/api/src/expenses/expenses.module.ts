import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { FileUploadService } from './file-upload.service';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, FileUploadService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
