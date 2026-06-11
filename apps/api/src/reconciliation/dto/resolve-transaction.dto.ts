import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '@prisma/client';

export enum TransactionResolution {
  LINK_PAYMENT = 'LINK_PAYMENT',
  LINK_EXPENSE = 'LINK_EXPENSE',
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  BANK_CHARGE = 'BANK_CHARGE',
  IGNORE = 'IGNORE',
}

export class CreateExpenseFromTransactionDto {
  @IsString()
  @IsNotEmpty()
  vendorName!: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveTransactionDto {
  @IsEnum(TransactionResolution)
  resolution!: TransactionResolution;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateExpenseFromTransactionDto)
  expenseData?: CreateExpenseFromTransactionDto;

  @IsOptional()
  @IsString()
  note?: string;
}
