import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProposalStatus } from '@prisma/client';

export class ProposalFiltersDto {
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
