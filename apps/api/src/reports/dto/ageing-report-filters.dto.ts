import { IsOptional, IsString } from 'class-validator';

export class AgeingReportFiltersDto {
  @IsOptional()
  @IsString()
  clientId?: string;
}
