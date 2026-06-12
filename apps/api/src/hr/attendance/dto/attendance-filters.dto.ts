import { IsOptional, IsString } from 'class-validator';

export class AttendanceFiltersDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  month?: string;
}
