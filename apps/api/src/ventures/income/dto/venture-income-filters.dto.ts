import { IsOptional, IsDateString, IsString } from 'class-validator';

export class VentureIncomeFiltersDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
