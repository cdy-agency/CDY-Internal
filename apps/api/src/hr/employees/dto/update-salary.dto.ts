import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSalaryDto {
  @IsNumber()
  @Min(0)
  newSalary!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
