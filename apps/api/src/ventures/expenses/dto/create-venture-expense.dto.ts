import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateVentureExpenseDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  ventureShare!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsDateString()
  date!: string;

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cdyShare?: number;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  expenseId?: string;
}
