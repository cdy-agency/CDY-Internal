import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ArFiltersDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdueOnly?: boolean;

  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW', 'CURRENT'])
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CURRENT';
}
