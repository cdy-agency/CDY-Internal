import { Transform } from 'class-transformer';
import { IsOptional, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class VentureExpenseFiltersDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isShared?: boolean;
}
