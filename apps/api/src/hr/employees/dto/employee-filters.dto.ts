import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class EmployeeFiltersDto {
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
