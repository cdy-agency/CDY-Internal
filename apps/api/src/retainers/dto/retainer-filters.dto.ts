import { IsOptional, IsEnum, IsString } from 'class-validator';
import { RetainerStatus } from '@prisma/client';

export class RetainerFiltersDto {
  @IsOptional()
  @IsEnum(RetainerStatus)
  status?: RetainerStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
