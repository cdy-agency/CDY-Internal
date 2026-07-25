import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, LeadSource, PipelineStage } from '@prisma/client';

export const LEAD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'convertedAt',
  'estimatedValue',
  'companyName',
] as const;

export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];

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
  createdBy?: string;

  @IsOptional()
  @IsString()
  serviceInterest?: string;

  /** COMPANY = company lead, INDIVIDUAL = person lead */
  @IsOptional()
  @IsEnum(ClientType)
  leadType?: ClientType;

  /** venture = has ventureId, service = no venture */
  @IsOptional()
  @IsIn(['venture', 'service'])
  leadKind?: 'venture' | 'service';

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

  @IsOptional()
  @IsIn(LEAD_SORT_FIELDS)
  sortBy?: LeadSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
