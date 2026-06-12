import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTargetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueTarget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dealsTarget?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
