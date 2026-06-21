import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { SoftwareProjectType } from '@prisma/client';

export class CreateSoftwareProjectDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SoftwareProjectType)
  projectType?: SoftwareProjectType;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsString()
  totalCost?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSoftwareProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SoftwareProjectType)
  projectType?: SoftwareProjectType;

  @IsOptional()
  @IsString()
  notes?: string;
}
