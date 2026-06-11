import { Module } from '@nestjs/common';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { CsvParserService } from './csv-parser.service';

@Module({
  controllers: [ReconciliationController],
  providers: [ReconciliationService, CsvParserService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
