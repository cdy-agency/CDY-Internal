import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateBillDto {
  @IsString()
  @IsNotEmpty()
  vendorName!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  dueDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PayBillDto {
  @IsDateString()
  paidAt!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @IsOptional()
  reference?: string;
}
