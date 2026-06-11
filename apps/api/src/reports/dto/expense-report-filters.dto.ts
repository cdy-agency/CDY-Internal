import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class ExpenseReportFiltersDto {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
