import { Transform } from 'class-transformer';
import { IsOptional, IsEnum, IsDateString, IsInt, Min, IsString } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class ExpenseFiltersDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  ventureId?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
