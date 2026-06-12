import { IsOptional, IsString } from 'class-validator';

export class SalesReportFiltersDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
