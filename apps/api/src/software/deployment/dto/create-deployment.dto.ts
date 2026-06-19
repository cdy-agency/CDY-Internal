import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { BugSeverity, MaintenanceType } from '@prisma/client';

export class CreateDeploymentDto {
  @IsOptional()
  @IsDateString()
  deployedAt?: string;

  @IsOptional()
  @IsString()
  deploymentUrl?: string;

  @IsOptional()
  @IsString()
  serverDetails?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaintenanceLogDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @IsOptional()
  @IsEnum(BugSeverity)
  priority?: BugSeverity;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
