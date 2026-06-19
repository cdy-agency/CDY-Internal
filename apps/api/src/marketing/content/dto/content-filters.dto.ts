import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ContentStatus } from '@prisma/client';

export class ContentFiltersDto {
  @IsOptional()
  @IsString()
  month?: string; // yyyy-MM format

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  platform?: string;
}
