import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class PortfolioReportFiltersDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
