import { IsOptional, IsEnum } from 'class-validator';
import { ReconciliationStatus } from '@prisma/client';

export class ReconciliationFiltersDto {
  @IsOptional()
  @IsEnum(ReconciliationStatus)
  status?: ReconciliationStatus;
}
