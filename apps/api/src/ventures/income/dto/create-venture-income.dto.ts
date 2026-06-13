import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';

export class CreateVentureIncomeDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
