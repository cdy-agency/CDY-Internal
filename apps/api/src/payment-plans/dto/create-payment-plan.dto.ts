import {
  IsArray,
  IsNumber,
  IsDateString,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class InstalmentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}

export class CreatePaymentPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstalmentDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(12)
  instalments!: InstalmentDto[];
}

export class PayInstalmentDto {
  @IsDateString()
  paidAt!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;
}
