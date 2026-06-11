import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { CommissionStatus } from '@prisma/client';

export class CommissionFiltersDto {
  @IsString()
  month!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class PayrollMonthDto {
  @IsString()
  month!: string;
}

export class ApproveAllDto {
  @IsString()
  month!: string;
}
