import { IsDateString, IsOptional, IsString } from 'class-validator';

export class TerminateEmployeeDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
