import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateCommissionRuleDto {
  @IsString()
  agentId!: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent!: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateCommissionRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
