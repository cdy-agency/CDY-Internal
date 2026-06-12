import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetTargetDto {
  @IsString()
  agentId!: string;

  @IsString()
  month!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revenueTarget!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  dealsTarget!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
