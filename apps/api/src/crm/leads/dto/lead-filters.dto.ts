import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LeadSource, PipelineStage } from '@prisma/client';

export class LeadFiltersDto {
  @IsOptional()
  @IsEnum(PipelineStage)
  stage?: PipelineStage;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  serviceInterest?: string;

  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @IsOptional()
  @Type(() => Number)
  minValue?: number;

  @IsOptional()
  @Type(() => Number)
  maxValue?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  hasOverdueFollowUp?: string;
}
