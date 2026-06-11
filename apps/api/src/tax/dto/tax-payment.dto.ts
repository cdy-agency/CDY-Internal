import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaxPaymentDto {
  @IsString()
  @IsNotEmpty()
  authorityName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsDateString()
  periodFrom!: string;

  @IsDateString()
  periodTo!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
