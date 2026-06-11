import { IsOptional, IsEnum } from 'class-validator';
import { RetainerStatus } from '@prisma/client';

export class RetainerFiltersDto {
  @IsOptional()
  @IsEnum(RetainerStatus)
  status?: RetainerStatus;

  @IsOptional()
  clientId?: string;
}
