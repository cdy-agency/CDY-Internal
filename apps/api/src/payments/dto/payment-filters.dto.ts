import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaymentFiltersDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

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
