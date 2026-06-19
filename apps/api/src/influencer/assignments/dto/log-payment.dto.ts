import { IsDecimal, IsOptional, IsString } from 'class-validator';

export class LogPaymentDto {
  @IsDecimal()
  amount!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
