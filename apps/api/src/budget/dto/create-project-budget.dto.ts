import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectBudgetDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  projectName!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  approvedBudget!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPct?: number;
}
