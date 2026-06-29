import { IsOptional, IsString, IsEnum, IsNumberString, IsDateString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class DirectIncomeFiltersDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
