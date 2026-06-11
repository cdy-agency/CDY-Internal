import { IsOptional, IsDateString, IsString } from 'class-validator';

export class PlReportFiltersDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;
}
