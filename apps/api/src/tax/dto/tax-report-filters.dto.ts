import { IsOptional, IsString, IsDateString } from 'class-validator';

export class TaxReportFiltersDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
