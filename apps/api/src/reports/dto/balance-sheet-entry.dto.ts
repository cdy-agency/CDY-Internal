import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { BalanceSheetType } from '@prisma/client';

export class CreateBalanceSheetEntryDto {
  @IsEnum(BalanceSheetType)
  type!: BalanceSheetType;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBalanceSheetEntryDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
